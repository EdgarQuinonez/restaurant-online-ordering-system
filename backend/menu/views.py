import csv
import io
import json

from django.core.exceptions import ValidationError
from django.db import transaction
from menu.models import MenuItem, Size
from menu.permissions import IsAdminOrReadOnly
from menu.serializers import MenuItemSerializer, SizeSerializer
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response


# Create your views here.
class MenuItemViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing menu items instances.
    """

    serializer_class = MenuItemSerializer
    queryset = MenuItem.objects.all()
    permission_classes_by_action = {"create": [IsAdminUser], "list": [AllowAny]}

    def get_permissions(self):
        try:
            # return permission_classes depending on `action`
            return [
                permission()
                for permission in self.permission_classes_by_action[self.action]
            ]
        except KeyError:
            # action is not set return default permission_classes
            return [permission() for permission in self.permission_classes]

    @action(detail=False, methods=["post"], url_path="upload-csv")
    def upload_from_csv(self, request):
        """
        Upload CSV file to populate MenuItem table with sizes
        Expected CSV format:
        name,category,type,imgAlt,imgSrc,size_name1,price1,description1,size_name2,price2,description2,...
        """
        # Check if file was provided in the request
        if "file" not in request.FILES:
            return Response(
                {"error": "No file provided. Please upload a CSV file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        csv_file = request.FILES["file"]

        # Validate file type
        if not csv_file.name.endswith(".csv"):
            return Response(
                {"error": "Invalid file format. Please upload a CSV file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Read and decode the CSV file
            data_set = csv_file.read().decode("UTF-8")
            io_string = io.StringIO(data_set)

            # Read header row to determine number of columns
            header = next(io_string).strip().split(",")

            # Check if we have at least the 5 required columns
            if len(header) < 5:
                return Response(
                    {
                        "error": "CSV must have at least 5 columns: name, category, type, imgAlt, imgSrc"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if additional columns follow the pattern of 3 columns per size
            additional_columns = len(header) - 5
            if additional_columns > 0 and additional_columns % 3 != 0:
                return Response(
                    {
                        "error": "Additional columns must be in groups of 3 (size_name, price, description)"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create a CSV reader
            reader = csv.reader(io_string, delimiter=",", quotechar='"')

            created_items = []
            errors = []

            # Use transaction to ensure all or nothing operation
            with transaction.atomic():
                for row_num, row in enumerate(
                    reader, start=2
                ):  # start=2 to account for header row
                    # Check if we have at least 5 columns
                    if len(row) < 5:
                        errors.append(
                            f"Row {row_num}: Invalid number of columns. Expected at least 5, got {len(row)}"
                        )
                        continue

                    # Extract the fixed columns
                    name, category, item_type, img_alt, img_src = row[:5]

                    # Validate required fields
                    if not all([name, category, item_type, img_src, img_alt]):
                        errors.append(f"Row {row_num}: All basic fields are required")
                        continue

                    # Validate type choice
                    if item_type not in dict(MenuItem.TYPE_CHOICES).keys():
                        valid_types = ", ".join(dict(MenuItem.TYPE_CHOICES).keys())
                        errors.append(
                            f"Row {row_num}: Invalid type '{item_type}'. Valid types are: {valid_types}"
                        )
                        continue

                    try:
                        # Create or update menu item
                        menu_item, created = MenuItem.objects.update_or_create(
                            name=name,
                            defaults={
                                "category": category,
                                "type": item_type,
                                "imgSrc": img_src,
                                "imgAlt": img_alt,
                            },
                        )

                        # Process size information if available
                        size_columns = row[5:]
                        num_sizes = len(size_columns) // 3

                        # Delete existing sizes for this menu item
                        menu_item.sizes.all().delete()

                        # Create new sizes
                        for i in range(num_sizes):
                            start_idx = i * 3
                            size_name = size_columns[start_idx]
                            price = size_columns[start_idx + 1]
                            description = size_columns[start_idx + 2]

                            # Only create size if we have all required fields
                            if all([size_name, price, description]):
                                try:
                                    Size.objects.create(
                                        menu_item=menu_item,
                                        order=i + 1,
                                        name=size_name,
                                        price=price,
                                        description=description,
                                    )
                                except (ValueError, ValidationError) as e:
                                    errors.append(
                                        f"Row {row_num}: Error creating size '{size_name}' - {str(e)}"
                                    )
                            elif any([size_name, price, description]):
                                errors.append(
                                    f"Row {row_num}: Incomplete size information at position {i + 1}"
                                )

                        if created:
                            created_items.append(menu_item.name)

                    except Exception as e:
                        errors.append(
                            f"Row {row_num}: Error creating menu item - {str(e)}"
                        )
                        continue

            # Prepare response
            response_data = {
                "message": f"Successfully processed {len(created_items)} items",
                "created_items": created_items,
                "total_created": len(created_items),
            }

            if errors:
                response_data["errors"] = errors
                response_data["error_count"] = len(errors)
                return Response(response_data, status=status.HTTP_207_MULTI_STATUS)

            return Response(response_data, status=status.HTTP_201_CREATED)

        except csv.Error as e:
            return Response(
                {"error": f"CSV parsing error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": f"Unexpected error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
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


class SizeViewSet(viewsets.ModelViewSet):
    queryset = Size.objects.all()
    serializer_class = SizeSerializer
