# permissions.py
from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow:
    - Read-only access to anyone (GET, HEAD, OPTIONS)
    - Write access only to admin users (POST, PUT, PATCH, DELETE)
    """

    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to admin users
        return request.user and request.user.is_staff
