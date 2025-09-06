from django.shortcuts import render
from menu.models import MenuItem
from menu.serializers import MenuItemSerializer
from rest_framework import viewsets


# Create your views here.
class MenuItemViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing menu items instances.
    """

    serializer_class = MenuItemSerializer
    queryset = MenuItem.objects.all()
