# payments/urls.py
from django.urls import path

from . import views

app_name = "payments"

urlpatterns = [
    # Payment Intent endpoints
    path(
        "create-payment-intent/",
        views.create_payment_intent,
        name="create_payment_intent",
    ),
    path("create-setup-intent/", views.create_setup_intent, name="create_setup_intent"),
    # Webhook endpoint (CSRF exempt, no authentication required)
    path("webhook/", views.stripe_webhook, name="stripe_webhook"),
]
