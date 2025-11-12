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
        read_only_fields = ["price", "item_name", "size_name", "subtotal"]


class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True, read_only=True)

    # New fields to handle the frontend data structure
    customer_info = serializers.DictField(write_only=True)
    address_info = serializers.DictField(write_only=True)
    order_instructions = serializers.DictField(write_only=True)
    payment_info = serializers.DictField(write_only=True)
    menu_items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=True,
        help_text="List of order items with menu_item_id, size_id, and quantity",
    )

    # Status display field
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            # Order Identification
            "id",
            "order_number",
            # Customer Information (from nested data - write only)
            "customer_info",
            # Address Information (from nested data - write only)
            "address_info",
            # Order Instructions (from nested data - write only)
            "order_instructions",
            # Payment Information (from nested data - write only)
            "payment_info",
            # Order Items
            "menu_items",
            "order_items",
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
            "order_items",
            "status_display",
            "total_amount",
            "created_at",
            "last_updated",
        ]

    def create(self, validated_data):
        # Extract nested data
        customer_info = validated_data.pop("customer_info", {})
        address_info = validated_data.pop("address_info", {})
        order_instructions = validated_data.pop("order_instructions", {})
        payment_info = validated_data.pop("payment_info", {})
        menu_items_data = validated_data.pop("menu_items", [])

        # Map customer info to model fields
        validated_data.update(
            {
                "customer_name": customer_info.get("name", ""),
                "customer_phone": customer_info.get("phone", ""),
                "customer_email": customer_info.get("email", ""),
            }
        )

        # Map address info to model fields
        validated_data.update(
            {
                "address_line_1": address_info.get("address_line_1", ""),
                "address_line_2": address_info.get("address_line_2", ""),
                "no_interior": address_info.get("no_interior", ""),
                "no_exterior": address_info.get("no_exterior", ""),
                "address_special_instructions": address_info.get(
                    "special_instructions", ""
                ),
            }
        )

        # Map order instructions to model fields
        validated_data.update(
            {
                "order_special_instructions": order_instructions.get(
                    "special_instructions", ""
                ),
            }
        )

        # Map payment info to model fields
        validated_data.update(
            {
                "card_number": payment_info.get("card_number", ""),
                "card_holder": payment_info.get("card_holder", ""),
                "expiry_date": payment_info.get("expiry_date", ""),
                "cvv": payment_info.get("cvv", ""),
                "transaction_id": payment_info.get("transaction_id", ""),
            }
        )

        # Set initial total amount (will be recalculated after creating order items)
        validated_data["total_amount"] = 0

        # Create the order
        order = Order.objects.create(**validated_data)

        # Create order items using the model method
        order.create_order_items(menu_items_data)

        # Recalculate and update total amount
        order.total_amount = order.calculate_total_amount()
        order.save()

        return order

    def to_representation(self, instance):
        """
        Custom representation to include only nested data in the response
        and remove duplicated flat fields
        """
        representation = {
            # Order Identification
            "id": instance.id,
            "order_number": instance.order_number,
            # Order Items
            "order_items": OrderItemSerializer(
                instance.order_items.all(), many=True
            ).data,
            # Order Status & Tracking
            "status": instance.status,
            "status_display": instance.get_status_display(),
            "scheduled_time": instance.scheduled_time,
            "total_amount": str(instance.total_amount),
            # Timestamps
            "created_at": instance.created_at,
            "last_updated": instance.last_updated,
            # Nested information
            "customer_info": {
                "name": instance.customer_name,
                "phone": instance.customer_phone,
                "email": instance.customer_email,
            },
            "address_info": {
                "address_line_1": instance.address_line_1,
                "address_line_2": instance.address_line_2,
                "no_interior": instance.no_interior,
                "no_exterior": instance.no_exterior,
                "special_instructions": instance.address_special_instructions,
            },
            "order_instructions": {
                "special_instructions": instance.order_special_instructions,
            },
            "payment_info": {
                "card_holder": instance.card_holder,
                "expiry_date": instance.expiry_date,
                "transaction_id": instance.transaction_id,
                # Note: We don't include sensitive card_number and cvv in response
            },
        }

        return representation
