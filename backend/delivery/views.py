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

    permission_classes_by_action = {"create": [AllowAny], "list": [AllowAny]}

    def get_permissions(self):
        try:
            # return permission_classes depending on `action`
            return [
                permission()
                for permission in self.permission_classes_by_action[self.action]
            ]
        except KeyError:
            # action is not set return default permission_classes
            return [permission() for permission in self.permission_classes]

    # POST /delivery/orders/: Create order with payment processing
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Process payment before creating the order
        payment_result = self._process_payment(request.data)

        if not payment_result.get("success"):
            return Response(
                {
                    "detail": f"Payment failed: {payment_result.get('message', 'Unknown error')}"
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        # If payment successful, create the order with transaction ID
        order = serializer.save(
            transaction_id=payment_result.get("transaction_id"),
            status="pending",  # Set initial status as pending
        )

        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                "detail": "Order created successfully",
                "order": serializer.data,
                "payment_status": "success",
                "transaction_id": payment_result.get("transaction_id"),
            },
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def _process_payment(self, data):
        """
        Process payment based on the provided payment information.
        This is a simplified payment processing simulation.
        In a real application, you would integrate with a payment gateway like Stripe, PayPal, etc.
        """
        card_number = data.get("card_number", "")
        card_holder = data.get("card_holder", "")
        expiry_date = data.get("expiry_date", "")
        cvv = data.get("cvv", "")
        total_amount = data.get("total_amount", 0)

        # Basic validation (in real app, use proper validation)
        if not all([card_number, card_holder, expiry_date, cvv]):
            return {"success": False, "message": "Missing payment information"}

        # Simulate payment processing logic
        # In reality, this would call a payment gateway API
        try:
            # Simple validation - check if card number is not empty and has minimum length
            if len(str(card_number).replace(" ", "")) < 13:
                return {"success": False, "message": "Invalid card number"}

            # Simulate random payment failures for testing (10% failure rate)
            import random

            if random.random() < 0.1:  # 10% chance of failure
                return {"success": False, "message": "Payment declined by bank"}

            # Generate a mock transaction ID
            import uuid

            transaction_id = f"txn_{uuid.uuid4().hex[:16]}"

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
        status_filter = request.query_params.get("status")
        date_filter = request.query_params.get("date")  # date in YYYY-MM-DD

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_filter:
            queryset = queryset.filter(created_at__date=date_filter)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # PUT /delivery/orders/[id]/status: update order status
    @action(detail=True, methods=["put"], url_path="status")
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get("status")
        if new_status not in dict(Order.STATUS_CHOICES).keys():
            return Response(
                {"detail": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST
            )
        order.status = new_status
        order.save()

        serializer = self.get_serializer(order)
        return Response(serializer.data)

    # DELETE /delivery/orders/[id]: Delete a single order
    def destroy(self, request, pk=None):
        order = get_object_or_404(Order, id=pk)

        if order.status in ["assigned", "picked", "delivered"]:
            return Response(
                {
                    "detail": "Cannot delete an order that is already assigned or processed."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.delete()
        return Response(
            {"detail": f"Order {pk} deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )

    # DELETE /delivery/orders/bulk_delete: Bulk delete orders
    @action(detail=False, methods=["delete"], url_path="bulk_delete")
    def bulk_delete(self, request):
        order_ids = request.data.get("order_ids", [])
        if not order_ids:
            return Response(
                {"detail": "No order IDs provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        orders = Order.objects.filter(id__in=order_ids, status="pending")

        if not orders.exists():
            return Response(
                {
                    "detail": "No deletable orders found (only pending orders can be deleted)."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_count, _ = orders.delete()
        return Response(
            {"detail": f"{deleted_count} orders deleted successfully."},
            status=status.HTTP_200_OK,
        )
