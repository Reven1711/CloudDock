# Manual Payment Test

If Stripe checkout has issues, you can manually test the payment completion:

## Option 1: Use Browser Console

1. Go to: http://localhost:8080/admin/dashboard
2. Open console (F12)
3. Paste this code (replace SESSION_ID with actual one from backend logs):

```javascript
fetch("http://localhost:4000/billing/storage/complete", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId:
      "cs_test_a1XcWQnvc9qaB9Ld9oB6f6WF78VK93TvSKXDlTP3NjII6ah0czEos7E7ih",
  }),
})
  .then((r) => r.json())
  .then((data) => console.log("Result:", data))
  .catch((err) => console.error("Error:", err));
```

## Option 2: Use cURL

```bash
curl -X POST http://localhost:4000/billing/storage/complete \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"cs_test_a1XcWQnvc9qaB9Ld9oB6f6WF78VK93TvSKXDlTP3NjII6ah0czEos7E7ih\"}"
```

## Option 3: Use Postman

- Method: POST
- URL: http://localhost:4000/billing/storage/complete
- Body (JSON):

```json
{
  "sessionId": "cs_test_a1XcWQnvc9qaB9Ld9oB6f6WF78VK93TvSKXDlTP3NjII6ah0czEos7E7ih"
}
```

## What This Tests

This will:

1. Verify the payment with Stripe
2. Update the StorageQuota in database
3. Return the new quota

If this works, then the issue is just the Stripe redirect, not the actual storage update logic.
