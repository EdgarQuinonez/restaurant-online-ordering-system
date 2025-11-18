from menu.models import MenuItem, Size
from menu.serializers import MenuItemSerializer, SizeSerializer
from rest_framework import serializers

from .models import Customer, Order, OrderItem


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
    subtotal_cents = serializers.ReadOnlyField()

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
            "subtotal_cents",
        ]
        read_only_fields = [
            "price",
            "item_name",
            "size_name",
            "subtotal",
            "subtotal_cents",
        ]


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

    # Device ID field for customer tracking (write-only, optional)
    device_id = serializers.UUIDField(
        write_only=True,
        required=False,
        help_text="Device ID for anonymous user tracking",
    )

    # Stripe payment fields (read-only in response)
    stripe_payment_intent_id = serializers.CharField(read_only=True)
    payment_status = serializers.CharField(read_only=True)
    payment_status_display = serializers.CharField(
        source="get_payment_status_display", read_only=True
    )
    total_amount_cents = serializers.IntegerField(read_only=True)
    currency = serializers.CharField(read_only=True)
    paid_at = serializers.DateTimeField(read_only=True)

    # Payment amount for frontend (write-only)
    payment_amount = serializers.IntegerField(
        write_only=True,
        required=False,
        min_value=1,
        help_text="Payment amount in cents for Stripe processing",
    )

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
            # Device ID for customer tracking
            "device_id",
            # Order Items
            "menu_items",
            "order_items",
            # Order Status & Tracking
            "status",
            "status_display",
            "scheduled_time",
            "total_amount",
            "total_amount_cents",
            # Stripe Payment Information
            "stripe_payment_intent_id",
            "payment_status",
            "payment_status_display",
            "currency",
            "paid_at",
            # Payment amount input
            "payment_amount",
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
            "total_amount_cents",
            "stripe_payment_intent_id",
            "payment_status",
            "payment_status_display",
            "currency",
            "paid_at",
            "created_at",
            "last_updated",
        ]

    def validate_payment_info(self, value):
        """
        Validate payment info structure for Stripe integration
        """
        # For Stripe, we don't need full card details on backend
        # The payment will be handled by Stripe Elements on frontend
        # But we can validate the structure if needed
        if not isinstance(value, dict):
            raise serializers.ValidationError("Payment info must be a dictionary")

        # You can add specific validations here if needed
        # For example, validate that payment method ID is present if using PaymentMethod
        return value

    def validate_menu_items(self, value):
        """
        Validate menu items data structure
        """
        if not value:
            raise serializers.ValidationError("Menu items cannot be empty")

        for item in value:
            if not all(key in item for key in ["menu_item_id", "size_id", "quantity"]):
                raise serializers.ValidationError(
                    "Each menu item must contain menu_item_id, size_id, and quantity"
                )

            if item["quantity"] < 1:
                raise serializers.ValidationError("Quantity must be at least 1")

        return value

    def validate(self, data):
        """
        Additional validation across multiple fields
        """
        # Calculate total amount from menu items to validate against payment_amount
        menu_items_data = data.get("menu_items", [])
        payment_amount = data.get("payment_amount")

        if menu_items_data and payment_amount:
            # Calculate expected amount in cents
            total_cents = 0
            for item_data in menu_items_data:
                try:
                    menu_item = MenuItem.objects.get(id=item_data["menu_item_id"])
                    size = Size.objects.get(id=item_data["size_id"])
                    quantity = item_data["quantity"]
                    price_cents = int(size.price * 100)  # Convert to cents
                    total_cents += price_cents * quantity
                except (MenuItem.DoesNotExist, Size.DoesNotExist):
                    # This will be caught by individual field validation
                    continue

            # Add delivery fee or other charges if needed
            # You might want to add delivery fee calculation here
            delivery_fee_cents = 0  # Calculate based on your business logic

            total_cents += delivery_fee_cents

            # Validate that payment_amount matches calculated total
            if payment_amount != total_cents:
                raise serializers.ValidationError(
                    {
                        "payment_amount": f"Payment amount {payment_amount} does not match calculated total {total_cents}"
                    }
                )

        return data

    def create(self, validated_data):
        # Extract nested data
        customer_info = validated_data.pop("customer_info", {})
        address_info = validated_data.pop("address_info", {})
        order_instructions = validated_data.pop("order_instructions", {})
        payment_info = validated_data.pop("payment_info", {})
        menu_items_data = validated_data.pop("menu_items", [])
        device_id = validated_data.pop("device_id", None)
        payment_amount = validated_data.pop("payment_amount", None)

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

        # Map payment info to model fields (for Stripe, we store minimal info)
        validated_data.update(
            {
                "card_last_four": payment_info.get("card_last_four", ""),
                "card_brand": payment_info.get("card_brand", ""),
                "transaction_id": payment_info.get("transaction_id", ""),
            }
        )

        # Set payment amount in cents
        if payment_amount:
            validated_data["total_amount_cents"] = payment_amount
        else:
            # Calculate from menu items if payment_amount not provided
            validated_data["total_amount_cents"] = 0

        # Set initial total amount (will be recalculated after creating order items)
        validated_data["total_amount"] = 0

        # Set initial status for payment processing
        validated_data["status"] = "payment_pending"
        validated_data["payment_status"] = "requires_payment_method"

        # Use the model's create_order_with_customer method to handle customer creation/association
        order, customer_device_id = Order.create_order_with_customer(
            order_data=validated_data,
            menu_items_data=menu_items_data,
            device_id=device_id,
        )

        # Store the device_id in the instance for the response
        order._device_id = customer_device_id

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
            "total_amount_cents": instance.total_amount_cents,
            # Stripe Payment Information
            "stripe_payment_intent_id": instance.stripe_payment_intent_id,
            "payment_status": instance.payment_status,
            "payment_status_display": instance.get_payment_status_display(),
            "currency": instance.currency,
            "paid_at": instance.paid_at,
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
                "card_last_four": instance.card_last_four,
                "card_brand": instance.card_brand,
                "transaction_id": instance.transaction_id,
            },
        }

        # Include device_id in the response if available (for new customers)
        if hasattr(instance, "_device_id"):
            representation["device_id"] = instance._device_id

        return representation


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for Customer model"""

    orders = OrderSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = ["device_id", "created_at", "last_seen", "orders"]
        read_only_fields = ["device_id", "created_at", "last_seen"]


class OrderListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing orders"""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(
        source="get_payment_status_display", read_only=True
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "status_display",
            "payment_status",
            "payment_status_display",
            "total_amount",
            "total_amount_cents",
            "created_at",
            "customer_name",
            "stripe_payment_intent_id",
            "paid_at",
        ]
        read_only_fields = fields


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating order status"""

    class Meta:
        model = Order
        fields = ["status"]

    def validate_status(self, value):
        """Validate status transitions"""
        valid_statuses = dict(Order.STATUS_CHOICES).keys()
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        return value


class PaymentStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating payment status"""

    class Meta:
        model = Order
        fields = ["payment_status", "stripe_payment_intent_id"]

    def validate_payment_status(self, value):
        """Validate payment status"""
        valid_statuses = [
            choice[0] for choice in Order._meta.get_field("payment_status").choices
        ]
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Invalid payment status. Must be one of: {', '.join(valid_statuses)}"
            )
        return value
