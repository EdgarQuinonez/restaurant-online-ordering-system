from django.contrib.auth.models import User

# Create your models here.
from django.db import models


class Employee(models.Model):
    ROLE_CHOICES = [
        ("manager", "Manager"),
        ("chef", "Chef"),
        ("delivery", "Delivery"),
        ("staff", "Staff"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        null=True,  # Make it nullable during creation
        blank=True,  # Allow blank in forms
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone_number = models.CharField(max_length=15)
    hire_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"
