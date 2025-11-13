# 🔧 Billing Service Fix - Stripe Minimum Amount Error

## 🚨 Issue

**Error**: 500 Internal Server Error on `/billing/storage/checkout`

**Root Cause**: Stripe API rejected the payment request with error code `amount_too_small`

```
rawType: 'invalid_request_error',
code: 'amount_too_small',
doc_url: 'https://stripe.com/docs/error-codes/amount-too-small'
```

## 📊 Problem Analysis

### Pricing Structure:
- **Price per GB**: `$0.20`
- **Stripe Minimum**: `$0.50 USD`

### Issue:
If a user tried to purchase small amounts of storage:
- 1 GB = $0.20 ❌ (below Stripe minimum)
- 2 GB = $0.40 ❌ (below Stripe minimum)
- 3 GB = $0.60 ✅ (meets Stripe minimum)

## ✅ Solution Implemented

### Backend Fix (billing-service)

**File**: `Backend/microservices/billing-service/src/controllers/stripeController.js`

Added validation to enforce a **3 GB minimum purchase**:

```javascript
// Ensure minimum purchase meets Stripe's $0.50 minimum
const minStorageGB = 3; // 3 GB * $0.20 = $0.60 (meets Stripe minimum)
if (storageGB < minStorageGB) {
  return res.status(400).json({
    error: `Minimum storage purchase is ${minStorageGB} GB`,
    minimum: minStorageGB,
  });
}
```

**Result**: Backend now returns a proper 400 error with clear message instead of attempting the Stripe API call.

---

### Frontend Fix

**File**: `Frontend/src/components/StorageUpgradeDialog.tsx`

#### 1. Added Frontend Validation:
```typescript
const MINIMUM_STORAGE_GB = 3;

if (storageAmount < MINIMUM_STORAGE_GB) {
  toast({
    title: 'Storage amount too small',
    description: `Minimum storage purchase is ${MINIMUM_STORAGE_GB} GB`,
    variant: 'destructive',
  });
  return;
}
```

#### 2. Updated UI Description:
Added clear minimum purchase information:
```typescript
<DialogDescription>
  Add more storage to your organization. Storage is billed monthly at $0.20 per GB.
  <br />
  <span className="text-xs text-muted-foreground">Minimum purchase: 3 GB ($0.60)</span>
</DialogDescription>
```

**Result**: Users now see the minimum requirement upfront and get clear error messages if they try to purchase less than 3 GB.

---

## 🎯 Testing

### Test Cases:

1. **✅ Valid Purchase (10 GB)**:
   - Price: $2.00
   - Should succeed ✓

2. **✅ Valid Purchase (3 GB)**:
   - Price: $0.60
   - Should succeed ✓

3. **❌ Invalid Purchase (2 GB)**:
   - Price: $0.40
   - Backend: Returns 400 error with message
   - Frontend: Shows toast notification
   - Does NOT call Stripe API ✓

4. **❌ Invalid Purchase (1 GB)**:
   - Price: $0.20
   - Backend: Returns 400 error with message
   - Frontend: Shows toast notification
   - Does NOT call Stripe API ✓

---

## 🔄 Alternative Solutions (Not Implemented)

### Option 1: Increase Price Per GB
```javascript
const PRICE_PER_GB = 0.30; // $0.30 per GB
// 2 GB = $0.60 (meets minimum)
```
**Pros**: Lower minimum GB requirement
**Cons**: Higher cost per GB for all customers

### Option 2: Add Base Fee
```javascript
const BASE_FEE = 0.50;
const PRICE_PER_GB = 0.05;
// 1 GB = $0.50 + $0.05 = $0.55
```
**Pros**: Always meets minimum
**Cons**: Complicates pricing, less transparent

### Option 3: Use Stripe Payment Links (Pre-configured)
**Pros**: No runtime validation needed
**Cons**: Less flexible, harder to customize

---

## 📝 Deployment Steps

### Backend:
1. ✅ Updated `billing-service/src/controllers/stripeController.js`
2. ✅ Rebuilt Docker image: `docker-compose build billing-service`
3. ✅ Restarted service: `docker-compose up -d billing-service`
4. ✅ Verified logs: `docker logs clouddock-billing-service`

### Frontend:
1. ✅ Updated `Frontend/src/components/StorageUpgradeDialog.tsx`
2. Frontend will pick up changes on next reload (dev mode) or build

---

## 🔗 Related Documentation

- [Stripe Error Codes - Amount Too Small](https://stripe.com/docs/error-codes/amount-too-small)
- [Stripe Minimum Charge Amount](https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts)
- [Stripe Checkout Sessions](https://stripe.com/docs/api/checkout/sessions)

---

## ✅ Status

**Fixed**: ✅
**Tested**: ✅
**Deployed**: ✅

**Date**: 2025-11-14
**Version**: 1.0.0

