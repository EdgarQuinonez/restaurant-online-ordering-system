## views.py
import json

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import PaymentIntent, StripeCustomer
from .services.stripe_service import StripeService


@require_http_methods(["POST"])
def create_payment_intent(request):
    """Create a PaymentIntent for frontend"""
    try:
        data = json.loads(request.body)
        amount = data.get("amount")  # Amount in cents
        currency = data.get("currency", "usd")

        # Get or create Stripe customer
        customer, created = StripeCustomer.objects.get_or_create(
            user=request.user,
            defaults={
                "stripe_customer_id": StripeService.create_customer(request.user)
            },
        )

        # Create payment intent
        intent_data = StripeService.create_payment_intent(
            amount=amount, currency=currency, customer_id=customer.stripe_customer_id
        )

        # Save payment intent to database
        PaymentIntent.objects.create(
            customer=customer,
            stripe_payment_intent_id=intent_data["id"],
            amount=amount / 100,  # Convert back to dollars
            currency=currency,
            status=intent_data["status"],
        )

        return JsonResponse(
            {
                "clientSecret": intent_data["client_secret"],
                "paymentIntentId": intent_data["id"],
            }
        )

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["POST"])
def create_setup_intent(request):
    """Create SetupIntent for saving payment method"""
    try:
        customer, created = StripeCustomer.objects.get_or_create(
            user=request.user,
            defaults={
                "stripe_customer_id": StripeService.create_customer(request.user)
            },
        )

        setup_data = StripeService.create_setup_intent(customer.stripe_customer_id)

        return JsonResponse(
            {
                "clientSecret": setup_data["client_secret"],
                "setupIntentId": setup_data["id"],
            }
        )

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def stripe_webhook(request):
    """Handle Stripe webhooks"""
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        return JsonResponse({"error": "Invalid payload"}, status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return JsonResponse({"error": "Invalid signature"}, status=400)

    # Handle the event
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        handle_payment_succeeded(payment_intent)
    elif event["type"] == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        handle_payment_failed(payment_intent)
    elif event["type"] == "customer.subscription.created":
        subscription = event["data"]["object"]
        handle_subscription_created(subscription)
    # Add more event handlers as needed

    return JsonResponse({"success": True})


def handle_payment_succeeded(payment_intent):
    """Handle successful payment"""
    try:
        # Update your database
        payment = PaymentIntent.objects.get(
            stripe_payment_intent_id=payment_intent["id"]
        )
        payment.status = "succeeded"
        payment.save()

        # Update order status, send confirmation email, etc.
        if payment.order:
            payment.order.status = "paid"
            payment.order.save()

    except PaymentIntent.DoesNotExist:
        pass


def handle_payment_failed(payment_intent):
    """Handle failed payment"""
    try:
        payment = PaymentIntent.objects.get(
            stripe_payment_intent_id=payment_intent["id"]
        )
        payment.status = "failed"
        payment.save()

        # Notify user, update order status, etc.
        if payment.order:
            payment.order.status = "payment_failed"
            payment.order.save()

    except PaymentIntent.DoesNotExist:
        pass  # Create your views here.
