## models.py
from delivery.models import Order
from django.contrib.auth.models import User
from django.db import models


class StripeCustomer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    stripe_customer_id = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)


class PaymentIntent(models.Model):
    customer = models.ForeignKey(StripeCustomer, on_delete=models.CASCADE)
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="usd")
    status = models.CharField(max_length=50)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PaymentMethod(models.Model):
    customer = models.ForeignKey(StripeCustomer, on_delete=models.CASCADE)
    stripe_payment_method_id = models.CharField(max_length=255, unique=True)
    type = models.CharField(max_length=50)  # card, etc.
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
