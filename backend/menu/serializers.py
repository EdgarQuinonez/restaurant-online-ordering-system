from rest_framework import serializers

from .models import MenuItem, Size


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["id", "order", "name", "price", "description", "menu_item"]


class MenuItemSerializer(serializers.ModelSerializer):
    sizes = SizeSerializer(many=True, read_only=True)

    class Meta:
        model = MenuItem
        fields = ["id", "name", "category", "type", "imgAlt", "imgSrc", "sizes"]
        read_only_fields = ["id"]

    def validate_type(self, value):
        """Ensure type is either 'food' or 'drink'"""
        if value not in ["food", "drink"]:
            raise serializers.ValidationError("Type must be either 'food' or 'drink'.")
        return value
