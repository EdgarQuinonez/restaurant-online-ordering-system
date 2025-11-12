from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .models import Order
from .serializers import OrderSerializer


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer

    permission_classes_by_action = {
        "create": [AllowAny],
        "list": [AllowAny],
        "retrieve": [AllowAny],
        "update_status": [AllowAny],
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
            # Save the order first
            order = serializer.save(
                transaction_id=payment_result.get("transaction_id"),
                status="pending",  # Set initial status as pending
            )

            # Get the serialized data for response
            response_data = serializer.data

            return Response(
                {
                    "success": True,
                    "detail": "Order created successfully",
                    "order": response_data,
                    "payment_status": "success",
                    "transaction_id": payment_result.get("transaction_id"),
                },
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

        # Apply filters
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

    # GET /delivery/orders/[id]/: Retrieve single order
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response({"success": True, "order": serializer.data})
        except Order.DoesNotExist:
            return Response(
                {"success": False, "detail": "Order not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

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
