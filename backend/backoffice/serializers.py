from typing import ReadOnly

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Employee


# Serializers define the API representation.
class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = [
            "url",
            "username",
            "employee",
            "first_name",
            "last_name",
            "email",
            "is_staff",
        ]


class EmployeeSerializer(serializers.ModelSerializer):
    # user = UserSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "user",
            "role",
            "phone_number",
            "hire_date",
            "is_active",
        ]
