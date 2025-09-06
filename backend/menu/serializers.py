from rest_framework import serializers

from .models import MenuItem


class MenuItemSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            "id",
            "name",
            "description",
            "price",
            "category",
            "type",
            "type_display",
        ]
        read_only_fields = ["id"]

    def validate_price(self, value):
        """Ensure price is positive"""
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_type(self, value):
        """Ensure type is either 'food' or 'drink'"""
        if value not in ["food", "drink"]:
            raise serializers.ValidationError("Type must be either 'food' or 'drink'.")
        return value
