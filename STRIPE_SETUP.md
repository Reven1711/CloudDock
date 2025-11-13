# Stripe Payment Setup Guide

This guide explains how to set up Stripe for storage upgrade payments in CloudDock.

## 🎯 Features Implemented

- ✅ Storage upgrade dialog with multiple GB options
- ✅ Custom storage amount input
- ✅ Price calculation: **$0.20 per GB per month**
- ✅ Stripe checkout integration
- ✅ Automatic quota update after successful payment
- ✅ Payment success/cancel notifications
- ✅ Purchase history tracking

---

## 📋 Setup Instructions

### Step 1: Get Stripe Test API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Sign up or log in to your Stripe account
3. Toggle to **Test Mode** (top right)
4. You'll see two keys:
   - **Publishable key** (`pk_test_...`) - Safe for frontend (not currently used, but good to have)
   - **Secret key** (`sk_test_...`) - Backend only (REQUIRED)

### Step 2: Update Backend Environment Variables

**Add your Stripe keys to your `.env` file** in the `Backend` folder:

1. Open (or create) `Backend/.env`
2. Add these lines (replace with your actual keys):

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
FRONTEND_URL=http://localhost:5173
```

**⚠️ IMPORTANT:**

- **Publishable Key** (`pk_test_...`): Can be exposed in frontend (not currently needed)
- **Secret Key** (`sk_test_...`): Backend only - NEVER expose this!
- **NEVER** hardcode API keys in your source code
- Your `.env` file is already in `.gitignore` and won't be committed
- See `Backend/ENV_TEMPLATE.md` for a complete `.env` template

### Step 3: Restart Backend Services

```bash
cd Backend
npm run dev:all
```

Wait for all services to start, especially the **billing service** on port `4005`.

---

## 🔑 Understanding Stripe Keys

Stripe provides two types of API keys:

| Key Type            | Format        | Usage                    | Security                        |
| ------------------- | ------------- | ------------------------ | ------------------------------- |
| **Publishable Key** | `pk_test_...` | Frontend/Client-side     | ✅ Safe to expose in JavaScript |
| **Secret Key**      | `sk_test_...` | Backend/Server-side only | ⚠️ MUST be kept secret          |

### Our Implementation

We're using **Stripe Checkout** (redirect to Stripe's hosted page), which means:

- ✅ **Backend creates the checkout session** using the **Secret Key**
- ✅ **User redirects to Stripe's page** (fully secure)
- ✅ **Stripe handles payment** (PCI compliant)
- ✅ **No frontend Stripe integration needed** (simpler and more secure)

**Note:** The Publishable Key would be needed if you implement:

- Stripe Elements (custom payment form)
- Stripe.js on the frontend
- Payment Request Button
- Link authentication

For now, we only need the **Secret Key** on the backend! 🎯

---

## 🧪 Testing the Payment Flow

### Using Stripe Test Cards

Stripe provides test card numbers that simulate different scenarios:

| Card Number           | Scenario           |
| --------------------- | ------------------ |
| `4242 4242 4242 4242` | Successful payment |
| `4000 0025 0000 3155` | Requires 3D Secure |
| `4000 0000 0000 9995` | Payment declined   |

**Test Card Details:**

- **Expiry**: Any future date (e.g., `12/25`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

### Step-by-Step Test

1. **Open Admin Dashboard**

   - Navigate to `http://localhost:5173/admin/dashboard`
   - Log in as an admin

2. **Click "Upgrade Storage"**

   - Find the "Organization Storage" card
   - Click the **"Upgrade Storage"** button

3. **Select Storage Amount**

   - Choose from preset options (10 GB, 25 GB, 50 GB, etc.)
   - Or enter a custom amount
   - See live price calculation

4. **Proceed to Checkout**

   - Click **"Proceed to Checkout"**
   - You'll be redirected to Stripe's test checkout page

5. **Complete Payment**

   - Use test card: `4242 4242 4242 4242`
   - Enter any future expiry date
   - Enter any CVC and ZIP code
   - Click "Pay"

6. **Success!**
   - You'll be redirected back to the admin dashboard
   - See a success notification
   - Your storage quota will be updated

---

## 🔍 How It Works

### Backend Flow

1. **User clicks "Upgrade Storage"** → Opens dialog
2. **User selects storage amount** → Price calculated
3. **User clicks "Proceed to Checkout"** → Frontend calls `/billing/storage/checkout`
4. **Backend creates Stripe session** → Returns checkout URL
5. **User redirected to Stripe** → Completes payment
6. **Stripe sends webhook** → Backend receives payment confirmation
7. **Backend updates quota** → Organization storage increased

### Database Changes

**New Collection: `storage_purchases`**

```javascript
{
  purchaseId: "uuid",
  orgId: "tenant-123",
  storageGB: 50,
  priceUSD: 1.00,
  stripeSessionId: "cs_test_...",
  status: "completed",
  expiresAt: "2025-12-13T00:00:00Z", // 1 month from purchase
  createdAt: "2025-11-13T00:00:00Z"
}
```

**Updated: `organizations` collection**

```javascript
{
  orgId: "tenant-123",
  quota: 100, // Increased from 50 to 100 GB
  // ... other fields
}
```

---

## 🔧 Webhook Setup (Optional for Production)

For production, you'll need to set up webhooks to receive payment events:

### 1. Install Stripe CLI

```bash
# Windows
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Mac/Linux
brew install stripe/stripe-cli/stripe
```

### 2. Login and Forward Webhooks

```bash
stripe login
stripe listen --forward-to localhost:4000/billing/webhook
```

This will give you a webhook secret (`whsec_...`) - update it in your env variables.

### 3. Test Webhook

```bash
stripe trigger checkout.session.completed
```

---

## 💡 Pricing Configuration

**Current Price:** $0.20 per GB per month

To change the price per GB, update:

**Backend:** `Backend/services/billing/src/controllers/stripeController.js`

```javascript
const PRICE_PER_GB = 0.2; // Change this value
```

**Frontend:** `Frontend/src/services/billingService.ts`

```javascript
export const calculateStoragePrice = (storageGB: number): number => {
  return storageGB * 0.2; // Change this value
};
```

---

## 🎨 UI Components

### StorageUpgradeDialog

- **Location**: `Frontend/src/components/StorageUpgradeDialog.tsx`
- **Features**:
  - Preset storage options (10 GB - 500 GB)
  - Custom storage input
  - Real-time price calculation
  - Current quota display
  - New quota preview

### Organization Storage Card

- **Location**: `Frontend/src/pages/AdminDashboard.tsx`
- **Features**:
  - Storage usage progress bar
  - "Upgrade Storage" button
  - Quota display in GB
  - Warning indicators (>80% usage)

---

## 🚀 Production Deployment

Before going to production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Update API keys** with live keys (start with `sk_live_...`)
3. **Set up webhooks** in Stripe Dashboard
4. **Update webhook secret** in environment variables
5. **Test thoroughly** with real cards in test mode first
6. **Add error monitoring** (Sentry, LogRocket, etc.)
7. **Set up backup payment methods** (if needed)
8. **Configure tax calculations** (if applicable)

---

## 🐛 Troubleshooting

### "Failed to create checkout session"

- ✅ Check if Stripe secret key is set correctly
- ✅ Check if billing service is running on port 4005
- ✅ Check backend logs for errors

### "Payment successful but quota not updated"

- ✅ Check if webhook is configured
- ✅ Check backend logs for webhook errors
- ✅ Manually trigger the webhook with Stripe CLI

### "Redirect not working"

- ✅ Check if `FRONTEND_URL` is set correctly
- ✅ Check if success/cancel URLs are correct

---

## 📚 Additional Resources

- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe API Reference](https://stripe.com/docs/api)

---

## 🎉 That's It!

Your CloudDock application now has a fully functional storage upgrade system with Stripe payments!
