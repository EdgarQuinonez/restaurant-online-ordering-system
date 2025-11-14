# Create your views here.
from django.contrib.auth.models import User
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Employee
from .permissions import CanUpdateOrderStatus, IsEmployee, IsManager
from .serializers import EmployeeSerializer, UserSerializer


# ViewSets define the view behavior.
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.filter(is_active=True)
    serializer_class = EmployeeSerializer
    permission_classes = [IsManager]  # Only managers can manage employees

    @action(detail=False, methods=["get"], permission_classes=[IsEmployee])
    def profile(self, request):
        employee = request.user.employee
        serializer = self.get_serializer(employee)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[IsManager])
    def register(self, request):
        # Extract user and employee data
        user_data = {
            "username": request.data.get("username"),
            "password": request.data.get("password"),
            "email": request.data.get("email"),
            "first_name": request.data.get("first_name"),
            "last_name": request.data.get("last_name"),
        }

        employee_data = {
            "role": request.data.get("role"),
            "phone_number": request.data.get("phone_number"),
        }

        # Create user
        user = User.objects.create_user(**user_data)

        # Create employee profile
        employee = Employee.objects.create(user=user, **employee_data)

        # Create token for immediate use
        token, created = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user_id": user.id,
                "username": user.username,
                "role": employee.role,
            },
            status=status.HTTP_201_CREATED,
        )
