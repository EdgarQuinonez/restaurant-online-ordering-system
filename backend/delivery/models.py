from django.core.validators import MinValueValidator
from django.db import models
from menu.models import MenuItem, Size


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
