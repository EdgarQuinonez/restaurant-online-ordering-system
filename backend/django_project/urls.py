"""
URL configuration for django_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework import routers, serializers, viewsets
from rest_framework.authtoken.views import obtain_auth_token

from backoffice.views import EmployeeViewSet, UserViewSet
from delivery.views import OrderViewSet
from menu.views import MenuItemViewSet, SizeViewSet

# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"menu", MenuItemViewSet)
router.register(r"sizes", SizeViewSet)
router.register(r"orders", OrderViewSet)
router.register(r"employees", EmployeeViewSet)  # Add employee endpoints

urlpatterns = [
    path("", include(router.urls)),
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls")),
    path(
        "api-token-auth/", obtain_auth_token, name="api_token_auth"
    ),  # Token authentication
]
