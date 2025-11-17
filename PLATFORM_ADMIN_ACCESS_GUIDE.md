# How to Access Platform Admin from Frontend

## Route Flow

```
Frontend (Port 5173)
    ↓
Gateway (Port 4000) - http://localhost:4000
    ↓
Billing Service (Port 4005) - http://localhost:4005
```

## Frontend Access

### 1. Direct Browser Access

Navigate directly to the login page:
```
http://localhost:5173/platform-admin/login
```

### 2. API Calls from Frontend

All API calls go through the **Gateway** (port 4000):

```typescript
// Frontend calls:
http://localhost:4000/billing/platform-admin/login

// Gateway forwards to:
http://localhost:4005/billing/platform-admin/login

// Billing service handles:
POST /billing/platform-admin/login
```

## Complete URL Structure

### Frontend Routes (React Router)
- `/platform-admin/login` → Login page
- `/platform-admin/dashboard` → Admin dashboard

### API Endpoints (via Gateway)
- `POST http://localhost:4000/billing/platform-admin/login`
- `GET http://localhost:4000/billing/platform-admin/verify`
- `GET http://localhost:4000/billing/config`
- `PUT http://localhost:4000/billing/config/:key`
- `GET http://localhost:4000/billing/pricing` (public)

## Environment Variables

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:4000
```

This tells the frontend to call the **Gateway**, not the billing service directly.

### Gateway
The gateway automatically routes:
- `/billing/*` → Billing Service (port 4005)

## Testing Access

### 1. Test Gateway Routing
```bash
# Should return pricing (public endpoint)
curl http://localhost:4000/billing/pricing
```

### 2. Test Platform Admin Login
```bash
curl -X POST http://localhost:4000/billing/platform-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clouddock.com", "password": "admin123"}'
```

### 3. Test from Frontend
1. Open browser: `http://localhost:5173/platform-admin/login`
2. Enter credentials:
   - Email: `admin@clouddock.com`
   - Password: `admin123`
3. Click "Login as Platform Admin"
4. Should redirect to `/platform-admin/dashboard`

## Troubleshooting

### Issue: "Network Error" or "CORS Error"

**Solution**: Check that:
1. Gateway is running on port 4000
2. Billing service is running on port 4005
3. Frontend `VITE_API_BASE_URL` is set to `http://localhost:4000`

### Issue: "401 Unauthorized"

**Solution**: 
- Check that you're using platform admin credentials (not organization admin)
- Verify token is being stored in localStorage
- Check browser console for token errors

### Issue: "403 Forbidden"

**Solution**:
- You're logged in as organization admin, not platform admin
- Logout and login again with platform admin credentials

### Issue: Routes Not Found (404)

**Solution**: 
1. Check gateway is routing `/billing/*` correctly
2. Check billing service is running
3. Verify routes are mounted at `/billing` in billing service

## Quick Test Script

```bash
# 1. Test gateway health
curl http://localhost:4000/health

# 2. Test billing service through gateway
curl http://localhost:4000/billing/pricing

# 3. Test platform admin login
curl -X POST http://localhost:4000/billing/platform-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clouddock.com", "password": "admin123"}'

# 4. Use token from step 3 to test config access
curl -X GET http://localhost:4000/billing/config \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Production Setup

In production, the frontend will call:
```
https://your-gateway-domain.com/billing/platform-admin/login
```

The gateway will forward to the billing service (which could be on Cloud Run or another service).

Make sure:
1. Gateway is publicly accessible
2. Billing service is accessible from gateway
3. CORS is configured for your frontend domain
4. Environment variables are set correctly

