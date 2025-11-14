from rest_framework import permissions


class IsEmployee(permissions.BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, "employee") or (
            request.user.is_authenticated and request.user.is_staff
        )


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        # Staff users have manager privileges
        if request.user.is_authenticated and request.user.is_staff:
            return True

        return (
            hasattr(request.user, "employee")
            and request.user.employee.role == "manager"
        )


class CanUpdateOrderStatus(permissions.BasePermission):
    def has_permission(self, request, view):
        # Staff users can update order status
        if request.user.is_authenticated and request.user.is_staff:
            return True

        if not hasattr(request.user, "employee"):
            return False

        employee = request.user.employee
        # Only chef, manager, and delivery can update order status
        return employee.role in ["chef", "manager", "delivery"]
