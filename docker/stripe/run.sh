#!/bin/sh
set -e

# 1. Login non-interactively
stripe login --api-key "$STRIPE_SECRET_KEY"

# 2. Start listener
stripe listen --forward-to http://backend-dev:8000/payments/webhook/
