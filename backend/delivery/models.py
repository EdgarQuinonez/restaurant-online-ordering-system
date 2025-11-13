import uuid
from datetime import datetime

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.signals import pre_save
from django.dispatch import receiver

from menu.models import MenuItem, Size


class Customer(models.Model):
    """
    Model to track anonymous users by device ID
    """

    device_id = models.UUIDField(
        unique=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for anonymous users",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Customer {self.device_id}"

    class Meta:
        ordering = ["-created_at"]


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("assigned", "Assigned"),
        ("picked", "Picked"),
        ("delivered", "Delivered"),
    ]

    # Order Identification
    order_number = models.CharField(max_length=50, unique=True)

    # Customer Information (from DeliveryInfoFormData)
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=15)
    customer_email = models.EmailField(max_length=255, blank=True, null=True)

    # Customer tracking for anonymous users
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="orders",
        null=True,
        blank=True,
        help_text="Anonymous customer identified by device ID",
    )

    # Detailed Address Information (from DeliveryInfoFormData)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    no_interior = models.CharField(max_length=50, blank=True, null=True)
    no_exterior = models.CharField(max_length=50)
    address_special_instructions = models.TextField(blank=True)

    # Order Instructions (from OrderSummaryFormData)
    order_special_instructions = models.TextField(blank=True)

    # Payment Information (from PaymentFormData)
    card_number = models.CharField(max_length=16)  # Last 4 digits only in practice
    card_holder = models.CharField(max_length=100)
    expiry_date = models.CharField(max_length=7)  # Format: MM/YYYY
    cvv = models.CharField(max_length=4)  # Encrypted in production

    # Transaction Reference
    transaction_id = models.CharField(max_length=100, blank=True, null=True)

    # Order Items - Updated to use proper relational fields
    items = models.ManyToManyField(
        MenuItem,
        through="OrderItem",
        through_fields=("order", "menu_item"),
        related_name="orders",
    )

    # Order Status & Tracking
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    scheduled_time = models.DateTimeField(null=True, blank=True)
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.order_number

    def create_order_items(self, menu_items_data):
        """
        Create OrderItem instances for this order

        Args:
            menu_items_data: List of dictionaries containing:
                - menu_item_id: ID of the MenuItem
                - size_id: ID of the Size
                - quantity: Quantity of the item
        """
        order_items = []
        for item_data in menu_items_data:
            try:
                menu_item = MenuItem.objects.get(id=item_data["menu_item_id"])
                size = Size.objects.get(id=item_data["size_id"])

                # Calculate price based on menu item and size
                price = size.price

                order_item = OrderItem.objects.create(
                    order=self,
                    menu_item=menu_item,
                    size=size,
                    quantity=item_data["quantity"],
                    price=price,
                    item_name=menu_item.name,
                    size_name=size.name,
                )
                order_items.append(order_item)
            except (MenuItem.DoesNotExist, Size.DoesNotExist) as e:
                # Handle missing items - you might want to log this or raise an exception
                print(f"Error creating order item: {e}")
                continue

        return order_items

    def calculate_total_amount(self):
        """Calculate total amount from all order items"""
        return sum(item.price * item.quantity for item in self.order_items.all())

    @classmethod
    def create_order_with_customer(cls, order_data, menu_items_data, device_id=None):
        """
        Create a new order with customer association

        Args:
            order_data: Dictionary containing order fields
            menu_items_data: List of menu items for the order
            device_id: Optional device ID for existing customer
        """
        # Find or create customer
        customer = None
        print("device_id on create_order_with_customer: ", device_id)
        if device_id:
            try:
                customer = Customer.objects.get(device_id=device_id)
            except Customer.DoesNotExist:
                customer = None

        if not customer:
            customer = Customer.objects.create()

        # Create the order
        order = cls.objects.create(customer=customer, **order_data)

        # Create order items
        order.create_order_items(menu_items_data)

        # Recalculate and update total amount
        order.total_amount = order.calculate_total_amount()
        order.save()

        return order, customer.device_id

    class Meta:
        ordering = ["-created_at"]


class OrderItem(models.Model):
    """Intermediate model to store order items with size and quantity"""

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="order_items"
    )
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    size = models.ForeignKey(Size, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    price = models.DecimalField(
        max_digits=6, decimal_places=2, validators=[MinValueValidator(0)]
    )

    # Store item details at time of order (in case menu items change)
    item_name = models.CharField(max_length=255)
    size_name = models.CharField(max_length=255)

    class Meta:
        unique_together = ["order", "menu_item", "size"]

    def __str__(self):
        return f"{self.quantity}x {self.item_name} - {self.size_name}"

    def save(self, *args, **kwargs):
        # Store current item names at time of order
        if not self.item_name:
            self.item_name = self.menu_item.name
        if not self.size_name:
            self.size_name = self.size.name
        super().save(*args, **kwargs)

    @property
    def subtotal(self):
        return self.price * self.quantity


@receiver(pre_save, sender=Order)
def generate_order_number(sender, instance, **kwargs):
    """
    Generate a unique order number before saving if it doesn't exist
    Format: ORD-YYYYMMDD-UUID
    """
    if not instance.order_number:
        date_part = datetime.now().strftime("%Y%m%d")
        unique_part = str(uuid.uuid4())[:8].upper()
        instance.order_number = f"ORD-{date_part}-{unique_part}"


@receiver(pre_save, sender=Customer)
def update_last_seen(sender, instance, **kwargs):
    """
    Update last_seen timestamp when customer places an order
    """
    instance.last_seen = datetime.now()
