# Billing Service

Billing and payment service for CloudDock with Stripe integration. Handles storage purchase and payment processing.

## Setup

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Update the `.env` file with your MongoDB and Stripe credentials.

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the service:
   ```bash
   npm start
   ```

## Docker Build

```bash
docker build -t clouddock-billing-service .
docker run -p 4005:4005 --env-file .env clouddock-billing-service
```

## API Endpoints

- `POST /billing/storage/checkout` - Create Stripe checkout session
- `POST /billing/storage/complete` - Complete payment manually (dev only)
- `GET /billing/storage/history/:orgId` - Get purchase history
- `POST /billing/webhook` - Stripe webhook endpoint
- `GET /health` - Health check

## Environment Variables

See `env.example` for all required environment variables including Stripe configuration.

## Stripe Setup

1. Get your Stripe secret key from https://dashboard.stripe.com/test/apikeys
2. Set up a webhook endpoint for production (optional for development)
3. Add `STRIPE_SECRET_KEY` to `.env`
4. For production, add `STRIPE_WEBHOOK_SECRET` to `.env`

## Features

- Stripe checkout session creation
- Webhook handling for payment events
- Storage quota management
- Purchase history tracking
- Manual payment completion (for development)

