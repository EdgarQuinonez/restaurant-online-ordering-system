from django.db import models


# Create your models here.
class MenuItem(models.Model):
    TYPE_CHOICES = [
        ("food", "Food"),
        ("drink", "Drink"),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=6, decimal_places=2)
    category = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)

    def __str__(self):
        return self.name
