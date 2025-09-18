from django.db import models


# Create your models here.
class MenuItem(models.Model):
    TYPE_CHOICES = [
        ("food", "Food"),
        ("drink", "Drink"),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    imgAlt = models.TextField()
    imgSrc = models.URLField(max_length=200)

    def __str__(self):
        return self.name


class Size(models.Model):
    menu_item = models.ForeignKey(
        MenuItem, related_name="sizes", on_delete=models.CASCADE
    )
    order = models.SmallIntegerField()
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=6, decimal_places=2)
    description = models.TextField()

    def __str__(self):
        return self.name
