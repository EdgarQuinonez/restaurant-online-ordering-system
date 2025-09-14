import json

from menu.models import MenuItem
from menu.serializers import MenuItemSerializer
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


# Create your views here.
class MenuItemViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing menu items instances.
    """

    serializer_class = MenuItemSerializer
    queryset = MenuItem.objects.all()

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def upload_from_json(self, request):
        try:
            # Get the uploaded file from request
            json_file = request.FILES.get("file")

            if not json_file:
                return Response(
                    {"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Read and parse the JSON file
            data = json.load(json_file)
            menu_items_data = data.get("menuItems", [])

            created_count = 0
            skipped_count = 0

            for item_data in menu_items_data:
                # Create menu item without using the original ID
                menu_item_data = {
                    "name": item_data.get("name"),
                    "description": item_data.get("description"),
                    "price": item_data.get("price"),
                    "category": item_data.get("category"),
                    "type": item_data.get("type"),
                }

                # Create or update based on your needs
                # Here's an example that creates new items
                serializer = self.get_serializer(data=menu_item_data)

                if serializer.is_valid():
                    serializer.save()
                    created_count += 1
                else:
                    skipped_count += 1

            return Response(
                {
                    "message": f"Successfully created {created_count} menu items",
                    "created": created_count,
                    "skipped": skipped_count,
                },
                status=status.HTTP_201_CREATED,
            )

        except json.JSONDecodeError:
            return Response(
                {"error": "Invalid JSON file"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
