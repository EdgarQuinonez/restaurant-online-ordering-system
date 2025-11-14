# services/stripe_service.py
import stripe
from django.conf import settings
from django.contrib.auth.models import User

stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    @staticmethod
    def create_customer(user: User) -> str:
        """Create a Stripe customer for a user"""
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.first_name} {user.last_name}",
                metadata={"user_id": user.id},
            )
            return customer.id
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    @staticmethod
    def create_payment_intent(
        amount: int, currency: str = "usd", customer_id: str = None
    ) -> dict:
        """Create a PaymentIntent for one-time payment"""
        try:
            intent_data = {
                "amount": amount,  # in cents
                "currency": currency,
                "automatic_payment_methods": {
                    "enabled": True,
                },
                "metadata": {"integration_check": "accept_a_payment"},
            }

            if customer_id:
                intent_data["customer"] = customer_id

            intent = stripe.PaymentIntent.create(**intent_data)

            return {
                "client_secret": intent.client_secret,
                "id": intent.id,
                "status": intent.status,
            }
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    @staticmethod
    def create_setup_intent(customer_id: str) -> dict:
        """Create a SetupIntent for saving payment method"""
        try:
            setup_intent = stripe.SetupIntent.create(
                customer=customer_id,
                payment_method_types=["card"],
            )
            return {"client_secret": setup_intent.client_secret, "id": setup_intent.id}
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    @staticmethod
    def confirm_payment_intent(payment_intent_id: str) -> dict:
        """Confirm a PaymentIntent"""
        try:
            intent = stripe.PaymentIntent.confirm(payment_intent_id)
            return {"status": intent.status, "id": intent.id}
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")

    @staticmethod
    def retrieve_payment_intent(payment_intent_id: str) -> dict:
        """Retrieve a PaymentIntent"""
        try:
            return stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
