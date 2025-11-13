from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .models import Customer, Order
from .serializers import OrderListSerializer, OrderSerializer


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    permission_classes_by_action = {
        "create": [AllowAny],
        "list": [AllowAny],
        "retrieve": [AllowAny],
        "update_status": [AllowAny],
        "my_orders": [AllowAny],
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
        if not self.request.user.is_staff:
            device_id = self.request.headers.get("X-Device-ID")
            if device_id:
                try:
                    customer = Customer.objects.get(device_id=device_id)
                    queryset = queryset.filter(customer=customer)
                except Customer.DoesNotExist:
                    # Return empty queryset if customer doesn't exist
                    return Order.objects.none()
            else:
                # Return empty queryset if no device_id provided for anonymous user
                return Order.objects.none()

        return queryset

    # POST /delivery/orders/: Create order with payment processing
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract payment info from the nested structure
        payment_info = request.data.get("payment_info", {})

        # Process payment before creating the order
        payment_result = self._process_payment(payment_info)

        if not payment_result.get("success"):
            return Response(
                {
                    "success": False,
                    "detail": f"Payment failed: {payment_result.get('message', 'Unknown error')}",
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        # If payment successful, create the order with transaction ID
        try:
            # Get device_id from header if provided
            device_id = request.headers.get("X-Device-ID")

            # Include device_id in the data for the serializer
            order_data = serializer.validated_data
            print("Device Id provided on header: ", device_id)
            if device_id:
                order_data["device_id"] = device_id

            # Save the order
            order = serializer.save(
                transaction_id=payment_result.get("transaction_id"),
                status="pending",  # Set initial status as pending
            )

            # Get the serialized data for response
            response_data = serializer.data

            # Build response with device_id if available (for new customers)
            response_payload = {
                "success": True,
                "detail": "Order created successfully",
                "order": response_data,
                "payment_status": "success",
                "transaction_id": payment_result.get("transaction_id"),
            }

            # Include device_id in response if it was generated (new customer)
            if hasattr(order, "_device_id"):
                response_payload["device_id"] = order._device_id

            return Response(
                response_payload,
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {"success": False, "detail": f"Order creation failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def _process_payment(self, payment_info):
        """
        Process payment based on the provided payment information.
        This is a simplified payment processing simulation.
        In a real application, you would integrate with a payment gateway like Stripe, PayPal, etc.
        """
        card_number = payment_info.get("card_number", "")
        card_holder = payment_info.get("card_holder", "")
        expiry_date = payment_info.get("expiry_date", "")
        cvv = payment_info.get("cvv", "")

        # Basic validation (in real app, use proper validation)
        if not all([card_number, card_holder, expiry_date, cvv]):
            return {"success": False, "message": "Missing payment information"}

        # Simulate payment processing logic
        # In reality, this would call a payment gateway API
        try:
            # Simple validation - check if card number is not empty and has minimum length
            if len(str(card_number).replace(" ", "")) < 13:
                return {"success": False, "message": "Invalid card number"}

            # Validate expiry date format (MM/YYYY)
            if len(expiry_date) != 7 or expiry_date[2] != "/":
                return {
                    "success": False,
                    "message": "Invalid expiry date format. Use MM/YYYY",
                }

            # Validate CVV length
            if len(cvv) not in [3, 4]:
                return {"success": False, "message": "Invalid CVV"}

            # Simulate random payment failures for testing (10% failure rate)
            import random

            if random.random() < 0.1:  # 10% chance of failure
                return {"success": False, "message": "Payment declined by bank"}

            # Generate a mock transaction ID
            import uuid

            transaction_id = (
                payment_info.get("transaction_id") or f"txn_{uuid.uuid4().hex[:16]}"
            )

            return {
                "success": True,
                "transaction_id": transaction_id,
                "message": "Payment processed successfully",
            }

        except Exception as e:
            return {"success": False, "message": f"Payment processing error: {str(e)}"}

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

            # Check if user has permission to update this order
            if not request.user.is_staff:
                return Response(
                    {"success": False, "detail": "Permission denied."},
                    status=status.HTTP_403_FORBIDDEN,
                )

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
        # Only allow admin users to bulk delete
        if not request.user.is_staff:
            return Response(
                {"success": False, "detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

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
        # Only allow admin users to search all orders
        if not request.user.is_staff:
            return Response(
                {"success": False, "detail": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN,
            )

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
