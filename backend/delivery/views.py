import json

import stripe
from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from backoffice.permissions import CanUpdateOrderStatus, IsManager
from menu.models import MenuItem, Size
from payments.models import PaymentIntent, StripeCustomer
from payments.services.stripe_service import StripeService

from .models import Customer, Order
from .serializers import OrderListSerializer, OrderSerializer


class OrderPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    pagination_class = OrderPagination

    permission_classes_by_action = {
        "create": [AllowAny],
        "list": [IsManager],
        "retrieve": [AllowAny],
        "update_status": [CanUpdateOrderStatus],
        "my_orders": [AllowAny],
        "create_payment_intent": [AllowAny],
        "default": [IsAdminUser],
    }

    def get_permissions(self):
        if self.action in self.permission_classes_by_action:
            return [
                permission()
                for permission in self.permission_classes_by_action[self.action]
            ]
        else:
            return [
                permission()
                for permission in self.permission_classes_by_action["default"]
            ]

    def get_queryset(self):
        """
        Override to filter orders by device_id for non-admin users
        """
        queryset = super().get_queryset()

        # For non-admin users, filter by device_id if provided
        # if not self.request.user.is_staff or not IsManager():
        #
        #     device_id = self.request.headers.get("X-Device-ID")
        #     if device_id:
        #         try:
        #             customer = Customer.objects.get(device_id=device_id)
        #             queryset = queryset.filter(customer=customer)
        #         except Customer.DoesNotExist:
        #             # Return empty queryset if customer doesn't exist
        #             return Order.objects.none()
        #     else:
        #         # Return empty queryset if no device_id provided for anonymous user
        #         return Order.objects.none()

        return queryset

    # POST /delivery/orders/create-payment-intent/: Create payment intent for checkout
    @action(detail=False, methods=["post"], url_path="create-payment-intent")
    def create_payment_intent(self, request):
        """
        Create a PaymentIntent when checkout component loads
        This allows frontend to initialize Stripe Elements with client_secret
        """
        try:
            # Extract menu items from request
            menu_items_data = request.data.get("menu_items", [])

            # Get device_id from header if provided
            device_id = request.headers.get("X-Device-ID")

            # Validate menu items
            if not menu_items_data:
                return Response(
                    {
                        "success": False,
                        "detail": "Menu items are required to create payment intent",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Calculate amount from menu items
            amount = self._calculate_order_amount(menu_items_data)

            if amount <= 0:
                return Response(
                    {
                        "success": False,
                        "detail": "Invalid order amount calculated from menu items",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get or create Stripe customer
            customer_data = self._get_or_create_stripe_customer(
                request=request, device_id=device_id
            )

            if not customer_data.get("success"):
                return Response(
                    {
                        "success": False,
                        "detail": customer_data.get(
                            "message", "Failed to create customer"
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            stripe_customer_id = customer_data.get("stripe_customer_id")

            # Create payment intent
            intent_data = StripeService.create_payment_intent(
                amount=amount,
                currency="mxn",
                customer_id=stripe_customer_id,
            )

            # Save payment intent to database (without order association yet)
            payment_intent = PaymentIntent.objects.create(
                customer=customer_data.get("customer"),
                stripe_payment_intent_id=intent_data["id"],
                amount=amount / 100,  # Convert back to dollars for storage
                currency="mxn",
                status=intent_data["status"],
            )

            return Response(
                {
                    "success": True,
                    "payment_intent_id": intent_data["id"],
                    "client_secret": intent_data["client_secret"],
                    "amount": amount,
                    "currency": "mxn",
                    "detail": "Payment intent created successfully",
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "detail": f"Failed to create payment intent: {str(e)}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    # POST /delivery/orders/: Create order with existing payment intent
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_info = request.data.get("payment_info", {})
        menu_items_data = request.data.get("menu_items", [])
        payment_intent_id = request.data.get("payment_intent_id")

        # Get device_id from header if provided
        device_id = request.headers.get("X-Device-ID")

        # Process payment using existing payment intent or create new one
        if payment_intent_id:
            # Use existing payment intent
            payment_result = self._use_existing_payment_intent(
                payment_intent_id, menu_items_data
            )
        else:
            # Create new payment intent (fallback)
            payment_result = self._process_stripe_payment(
                payment_info, menu_items_data, device_id
            )

        if not payment_result.get("success"):
            return Response(
                {
                    "success": False,
                    "detail": f"Payment failed: {payment_result.get('message', 'Unknown error')}",
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        # If payment intent is ready, create the order
        try:
            # Include device_id in the data for the serializer
            order_data = serializer.validated_data
            print("Device Id provided on header: ", device_id)
            if device_id:
                order_data["device_id"] = device_id

            # Save the order
            order = serializer.save(
                transaction_id=payment_result.get("transaction_id"),
                status="payment_pending",  # Set initial status as payment_pending
                stripe_payment_intent_id=payment_result.get("payment_intent_id"),
                payment_status="requires_payment_method",
            )

            # Get the serialized data for response
            response_data = serializer.data

            # Build response with device_id if available (for new customers)
            response_payload = {
                "success": True,
                "detail": "Order created successfully",
                "order": response_data,
                "payment_status": "requires_payment_method",
                "transaction_id": payment_result.get("transaction_id"),
                "client_secret": payment_result.get("client_secret"),
                "payment_intent_id": payment_result.get("payment_intent_id"),
            }

            # Include device_id in response if it was generated (new customer)
            if hasattr(order, "_device_id"):
                response_payload["device_id"] = order._device_id

            return Response(
                response_payload,
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            # If order creation fails, try to cancel the payment intent
            if payment_result.get("payment_intent_id"):
                try:
                    StripeService.cancel_payment_intent(
                        payment_result.get("payment_intent_id")
                    )
                except Exception:
                    pass  # Log this error in production

            return Response(
                {"success": False, "detail": f"Order creation failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _use_existing_payment_intent(self, payment_intent_id, menu_items_data):
        """
        Use an existing PaymentIntent for order creation
        """
        try:
            # Verify the payment intent exists and is in correct status
            intent_data = StripeService.retrieve_payment_intent(payment_intent_id)

            # Calculate expected amount to verify consistency
            expected_amount = self._calculate_order_amount(menu_items_data)

            if intent_data["amount"] != expected_amount:
                return {
                    "success": False,
                    "message": f"Payment intent amount {intent_data['amount']} does not match calculated amount {expected_amount}",
                }

            # Verify payment intent is in correct state
            if intent_data["status"] not in [
                "requires_payment_method",
                "requires_confirmation",
            ]:
                return {
                    "success": False,
                    "message": f"Payment intent is in invalid state: {intent_data['status']}",
                }

            return {
                "success": True,
                "payment_intent_id": payment_intent_id,
                "client_secret": intent_data["client_secret"],
                "transaction_id": f"stripe_{payment_intent_id}",
                "message": "Using existing payment intent",
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Error using existing payment intent: {str(e)}",
            }

    def _process_stripe_payment(self, payment_info, menu_items_data, device_id=None):
        """
        Process payment using Stripe PaymentIntent (fallback method)
        """
        try:
            # Calculate amount from menu items (convert to cents for Stripe)
            amount = self._calculate_order_amount(menu_items_data)

            if amount <= 0:
                return {"success": False, "message": "Invalid order amount"}

            # Create Stripe customer (for logged-in users) or use device_id for anonymous
            customer_data = self._get_or_create_stripe_customer(
                request=self.request, device_id=device_id
            )

            if not customer_data.get("success"):
                return {"success": False, "message": customer_data.get("message")}

            stripe_customer_id = customer_data.get("stripe_customer_id")

            # Create payment intent
            intent_data = StripeService.create_payment_intent(
                amount=amount,
                currency="mxn",  # Using MXN as specified
                customer_id=stripe_customer_id,
            )

            # Save payment intent to database
            payment_intent = PaymentIntent.objects.create(
                customer=customer_data.get("customer"),
                stripe_payment_intent_id=intent_data["id"],
                amount=amount / 100,  # Convert back to dollars for storage
                currency="mxn",
                status=intent_data["status"],
            )

            return {
                "success": True,
                "transaction_id": f"stripe_{intent_data['id']}",
                "payment_intent_id": intent_data["id"],
                "client_secret": intent_data["client_secret"],
                "message": "Payment intent created successfully",
            }

        except Exception as e:
            return {
                "success": False,
                "message": f"Stripe payment processing error: {str(e)}",
            }

    def _calculate_order_amount(self, menu_items_data):
        """
        Calculate the total amount for the order in cents based on menu items
        """
        try:
            total_cents = 0

            if not menu_items_data:
                return 0

            for item_data in menu_items_data:
                try:
                    # Extract item data
                    menu_item_id = item_data.get("menu_item_id")
                    size_id = item_data.get("size_id")
                    quantity = item_data.get("quantity", 1)

                    # Validate required fields
                    if not menu_item_id or not size_id:
                        raise ValueError("Missing menu_item_id or size_id")

                    # Get menu item and size from database
                    menu_item = MenuItem.objects.get(id=menu_item_id)
                    size = Size.objects.get(id=size_id, menu_item=menu_item)

                    # Calculate price in cents (convert from decimal to cents)
                    price_cents = int(size.price * 100)

                    # Add to total
                    total_cents += price_cents * quantity

                except MenuItem.DoesNotExist:
                    raise ValueError(f"Menu item with ID {menu_item_id} does not exist")
                except Size.DoesNotExist:
                    raise ValueError(
                        f"Size with ID {size_id} does not exist for menu item {menu_item_id}"
                    )
                except (ValueError, TypeError) as e:
                    raise ValueError(f"Invalid item data: {str(e)}")

            # Add delivery fee if applicable (you can make this configurable)
            delivery_fee_cents = 0  # You can set this based on your business logic
            # Example: delivery_fee_cents = 2500  # $25.00 MXN in cents

            total_cents += delivery_fee_cents

            # Ensure minimum amount (Stripe requires at least 1 MXN cent)
            if total_cents < 1:
                total_cents = 1

            return total_cents

        except Exception as e:
            # Log the error for debugging
            print(f"Error calculating order amount: {str(e)}")
            raise ValueError(f"Failed to calculate order amount: {str(e)}")

    def _get_or_create_stripe_customer(self, request, device_id=None):
        """
        Get or create Stripe customer for the current user/device
        """
        try:
            # For authenticated users
            if request.user.is_authenticated:
                customer, created = StripeCustomer.objects.get_or_create(
                    user=request.user,
                    defaults={
                        "stripe_customer_id": StripeService.create_customer(
                            request.user
                        )
                    },
                )
                return {
                    "success": True,
                    "stripe_customer_id": customer.stripe_customer_id,
                    "customer": customer,
                }
            else:
                # For anonymous users, use device_id to find or create a customer
                if not device_id:
                    return {
                        "success": False,
                        "message": "Device ID is required for anonymous users",
                    }

                # Try to find existing customer by device_id
                try:
                    customer = Customer.objects.get(device_id=device_id)
                    # Check if this customer has a Stripe customer record
                    stripe_customer = StripeCustomer.objects.filter(
                        user=customer.user
                    ).first()

                    if stripe_customer:
                        return {
                            "success": True,
                            "stripe_customer_id": stripe_customer.stripe_customer_id,
                            "customer": stripe_customer,
                        }
                    else:
                        # Create Stripe customer for existing customer
                        stripe_customer_id = StripeService.create_customer(
                            customer.user
                        )
                        stripe_customer = StripeCustomer.objects.create(
                            user=customer.user, stripe_customer_id=stripe_customer_id
                        )
                        return {
                            "success": True,
                            "stripe_customer_id": stripe_customer_id,
                            "customer": stripe_customer,
                        }

                except Customer.DoesNotExist:
                    # For new anonymous customers, create a new customer
                    new_customer = Customer.objects.create(device_id=device_id)
                    # Create Stripe customer for the new customer
                    stripe_customer_id = StripeService.create_customer(
                        new_customer.user
                    )
                    stripe_customer = StripeCustomer.objects.create(
                        user=new_customer.user, stripe_customer_id=stripe_customer_id
                    )
                    return {
                        "success": True,
                        "stripe_customer_id": stripe_customer_id,
                        "customer": stripe_customer,
                    }

        except Exception as e:
            return {"success": False, "message": f"Customer creation failed: {str(e)}"}

    # GET /delivery/orders/ with optional filtering
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Apply additional filters
        status_filter = request.query_params.get("status")
        date_filter = request.query_params.get("date")  # date in YYYY-MM-DD
        order_number = request.query_params.get("order_number")
        customer_phone = request.query_params.get("customer_phone")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_filter:
            queryset = queryset.filter(created_at__date=date_filter)
        if order_number:
            queryset = queryset.filter(order_number__icontains=order_number)
        if customer_phone:
            queryset = queryset.filter(customer_phone__icontains=customer_phone)

        # Order by most recent first
        queryset = queryset.order_by("-created_at")

        # Use pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {"success": True, "count": queryset.count(), "orders": serializer.data}
        )

    # GET /delivery/orders/my-orders/: Get orders for current device_id
    @action(detail=False, methods=["get"], url_path="my-orders")
    def my_orders(self, request):
        """
        Get orders for the current device_id (anonymous user)
        """
        device_id = request.headers.get("X-Device-ID")

        if not device_id:
            return Response(
                {
                    "success": False,
                    "detail": "Device ID is required. Please include X-Device-ID header.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            customer = Customer.objects.get(device_id=device_id)
            orders = Order.objects.filter(customer=customer).order_by("-created_at")

            # Use simplified serializer for listing
            serializer = OrderListSerializer(orders, many=True)

            # Apply pagination to my_orders
            page = self.paginate_queryset(orders)
            if page is not None:
                serializer = OrderListSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            return Response(
                {
                    "success": True,
                    "count": orders.count(),
                    "orders": serializer.data,
                    "customer": {
                        "device_id": str(customer.device_id),
                        "created_at": customer.created_at,
                    },
                }
            )

        except Customer.DoesNotExist:
            return Response(
                {
                    "success": True,
                    "count": 0,
                    "orders": [],
                    "detail": "No orders found for this device.",
                }
            )

    # GET /delivery/orders/[id]/: Retrieve single order
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()

            # Check if user has permission to view this order
            if not self._can_view_order(request, instance):
                return Response(
                    {"success": False, "detail": "Order not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            serializer = self.get_serializer(instance)
            return Response({"success": True, "order": serializer.data})
        except Order.DoesNotExist:
            return Response(
                {"success": False, "detail": "Order not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    def _can_view_order(self, request, order):
        """
        Check if the current request can view the given order
        """
        # Admin users can view all orders
        if request.user.is_staff:
            return True

        # Non-admin users can only view their own orders (by device_id)
        device_id = request.headers.get("X-Device-ID")
        if device_id and order.customer:
            return str(order.customer.device_id) == device_id

        return False

    # PUT /delivery/orders/[id]/status: update order status
    @action(detail=True, methods=["put"], url_path="status")
    def update_status(self, request, pk=None):
        try:
            order = self.get_object()

            new_status = request.data.get("status")

            if new_status not in dict(Order.STATUS_CHOICES).keys():
                return Response(
                    {"success": False, "detail": "Invalid status value."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            order.status = new_status
            order.save()

            serializer = self.get_serializer(order)
            return Response(
                {
                    "success": True,
                    "detail": f"Order status updated to {new_status}",
                    "order": serializer.data,
                }
            )

        except Order.DoesNotExist:
            return Response(
                {"success": False, "detail": "Order not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    # DELETE /delivery/orders/[id]: Delete a single order
    def destroy(self, request, pk=None):
        try:
            order = self.get_object()

            # Check if user has permission to delete this order
            if not self._can_view_order(request, order):
                return Response(
                    {"success": False, "detail": "Order not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if order.status in ["assigned", "picked", "delivered"]:
                return Response(
                    {
                        "success": False,
                        "detail": "Cannot delete an order that is already assigned or processed.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            order_number = order.order_number
            order.delete()

            return Response(
                {
                    "success": True,
                    "detail": f"Order {order_number} deleted successfully.",
                },
                status=status.HTTP_200_OK,
            )

        except Order.DoesNotExist:
            return Response(
                {"success": False, "detail": "Order not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

    # DELETE /delivery/orders/bulk_delete: Bulk delete orders
    @action(detail=False, methods=["delete"], url_path="bulk_delete")
    def bulk_delete(self, request):
        order_ids = request.data.get("order_ids", [])
        if not order_ids:
            return Response(
                {"success": False, "detail": "No order IDs provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only allow deletion of pending orders
        orders = Order.objects.filter(id__in=order_ids, status="pending")

        if not orders.exists():
            return Response(
                {
                    "success": False,
                    "detail": "No deletable orders found (only pending orders can be deleted).",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_count, _ = orders.delete()
        return Response(
            {
                "success": True,
                "detail": f"{deleted_count} orders deleted successfully.",
            },
            status=status.HTTP_200_OK,
        )

    # GET /delivery/orders/search/: Search orders by various criteria
    @action(detail=False, methods=["get"], url_path="search")
    def search_orders(self, request):
        """
        Search orders by customer name, phone, email, or order number
        """
        search_query = request.query_params.get("q", "").strip()

        if not search_query:
            return Response(
                {"success": False, "detail": "Search query parameter 'q' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = Order.objects.filter(
            models.Q(customer_name__icontains=search_query)
            | models.Q(customer_phone__icontains=search_query)
            | models.Q(customer_email__icontains=search_query)
            | models.Q(order_number__icontains=search_query)
        ).order_by("-created_at")

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {"success": True, "count": queryset.count(), "orders": serializer.data}
        )
