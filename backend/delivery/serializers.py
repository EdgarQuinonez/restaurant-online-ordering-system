from menu.models import MenuItem, Size
from menu.serializers import MenuItemSerializer, SizeSerializer
from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item = MenuItemSerializer(read_only=True)
    menu_item_id = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.all(), source="menu_item", write_only=True
    )
    size = SizeSerializer(read_only=True)
    size_id = serializers.PrimaryKeyRelatedField(
        queryset=Size.objects.all(), source="size", write_only=True
    )
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "menu_item",
            "menu_item_id",
            "size",
            "size_id",
            "quantity",
            "price",
            "item_name",
            "size_name",
            "subtotal",
        ]
        read_only_fields = ["item_name", "size_name", "subtotal"]


class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True, read_only=True)
    items_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=True,
        help_text="List of order items with menu_item_id, size_id, quantity, and price",
    )

    # Status display field
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            # Order Identification
            "id",
            "order_number",
            # Customer Information
            "customer_name",
            "customer_phone",
            "customer_email",
            # Address Information
            "address_line_1",
            "address_line_2",
            "no_interior",
            "no_exterior",
            "address_special_instructions",
            # Order Instructions
            "order_special_instructions",
            # Payment Information (write-only for security)
            "card_number",
            "card_holder",
            "expiry_date",
            "cvv",
            "transaction_id",
            # Order Items
            "order_items",
            "items_data",
            # Order Status & Tracking
            "status",
            "status_display",
            "scheduled_time",
            "total_amount",
            # Timestamps
            "created_at",
            "last_updated",
        ]
        read_only_fields = [
            "id",
            "order_number",
            "transaction_id",
            "created_at",
            "last_updated",
            "status_display",
        ]
        extra_kwargs = {
            "card_number": {"write_only": True},
            "cvv": {"write_only": True},
        }
