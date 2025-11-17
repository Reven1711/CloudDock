# Frontend Access to Platform Admin - Complete Guide

## 🎯 Quick Answer

**To access Platform Admin from frontend:**

1. **Open browser**: `http://localhost:5173/platform-admin/login`
2. **Login with**: 
   - Email: `admin@clouddock.com`
   - Password: `admin123`
3. **You'll be redirected to**: `/platform-admin/dashboard`

That's it! The frontend automatically handles all API calls through the gateway.

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Port 5173)                      │
│  http://localhost:5173/platform-admin/login                 │
│                                                               │
│  User clicks "Login"                                          │
│  ↓                                                            │
│  Calls: platformAdminService.platformAdminLogin()            │
│  ↓                                                            │
│  API Call: POST http://localhost:4000/billing/platform-admin/login │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    GATEWAY (Port 4000)                      │
│  Receives: POST /billing/platform-admin/login              │
│  ↓                                                            │
│  Routes: app.all("/billing/*", ...)                          │
│  ↓                                                            │
│  Forwards to: http://localhost:4005/billing/platform-admin/login │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              BILLING SERVICE (Port 4005)                    │
│  Receives: POST /billing/platform-admin/login              │
│  ↓                                                            │
│  Route: router.post("/platform-admin/login", ...)           │
│  Mounted at: app.use("/billing", billingRoutes)             │
│  ↓                                                            │
│  Full path: /billing/platform-admin/login ✅                │
│  ↓                                                            │
│  Returns: { success: true, token: "...", user: {...} }     │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Frontend stores token
                    Redirects to dashboard
```

---

## 🔧 Configuration Files

### 1. Frontend Service (`Frontend/src/services/platformAdminService.ts`)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
```

**This means:**
- Frontend calls: `http://localhost:4000/billing/platform-admin/login`
- Gateway receives it and forwards to billing service

### 2. Gateway (`Backend/microservices/gateway/src/index.js`)

```javascript
app.all("/billing", proxyToService(targets.billing, "billing"));
app.all("/billing/*", proxyToService(targets.billing, "billing"));
```

**This means:**
- Any request to `/billing/*` is forwarded to billing service
- Full path is preserved (http-proxy default behavior)

### 3. Billing Service (`Backend/microservices/billing-service/src/index.js`)

```javascript
app.use("/billing", billingRoutes);
```

**This means:**
- Routes in `billingRoutes.js` are mounted at `/billing`
- Route `/platform-admin/login` becomes `/billing/platform-admin/login`

---

## ✅ Verification Steps

### Step 1: Check Services Are Running

```bash
# Check gateway
curl http://localhost:4000/health

# Check billing service directly
curl http://localhost:4005/health

# Check billing service through gateway
curl http://localhost:4000/billing/pricing
```

### Step 2: Test Platform Admin Login (API)

```bash
curl -X POST http://localhost:4000/billing/platform-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clouddock.com", "password": "admin123"}'
```

**Expected response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "platform-admin",
    "email": "admin@clouddock.com",
    "role": "platform-admin",
    "isPlatformAdmin": true
  }
}
```

### Step 3: Test from Frontend

1. Open: `http://localhost:5173/platform-admin/login`
2. Enter credentials
3. Check browser console (F12) for:
   - Network tab: Should see `POST /billing/platform-admin/login` → 200 OK
   - Application tab: Should see `platformAdminToken` in localStorage

---

## 🐛 Common Issues & Solutions

### Issue 1: "Network Error" or "Failed to fetch"

**Cause**: Gateway or billing service not running

**Solution**:
```bash
# Check if services are running
docker ps | grep clouddock

# Restart if needed
cd Backend/microservices
docker-compose up -d
```

### Issue 2: "CORS Error"

**Cause**: Frontend origin not in gateway CORS whitelist

**Solution**: Check gateway CORS configuration:
```javascript
// Backend/microservices/gateway/src/index.js
const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",");
```

Make sure `http://localhost:5173` is included.

### Issue 3: "404 Not Found"

**Cause**: Route path mismatch

**Solution**: Verify route structure:
- Frontend calls: `/billing/platform-admin/login`
- Gateway forwards: `/billing/platform-admin/login`
- Billing service expects: `/billing/platform-admin/login` ✅

### Issue 4: "401 Unauthorized" after login

**Cause**: Token not being sent with requests

**Solution**: Check `platformAdminService.ts`:
```typescript
const getAuthToken = () => {
  return localStorage.getItem('platformAdminToken') || '';
};
```

Verify token is stored after login.

---

## 📝 Frontend Code Flow

### 1. User Visits Login Page

```typescript
// Frontend/src/pages/PlatformAdminLogin.tsx
const handleSubmit = async (e: React.FormEvent) => {
  const response = await platformAdminLogin(email, password);
  // Calls: POST http://localhost:4000/billing/platform-admin/login
  if (response.success) {
    navigate('/platform-admin/dashboard');
  }
};
```

### 2. Dashboard Loads Configurations

```typescript
// Frontend/src/pages/PlatformAdminDashboard.tsx
useEffect(() => {
  const fetchConfigurations = async () => {
    const response = await getAllConfigurations();
    // Calls: GET http://localhost:4000/billing/config
    // With header: Authorization: Bearer <token>
  };
  fetchConfigurations();
}, []);
```

### 3. Update Configuration

```typescript
const handleSave = async (key: string) => {
  const response = await updateConfiguration(key, value);
  // Calls: PUT http://localhost:4000/billing/config/:key
  // With header: Authorization: Bearer <token>
};
```

---

## 🚀 Production Setup

In production, update:

1. **Frontend `.env`**:
   ```env
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```

2. **Gateway CORS**:
   ```env
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

3. **Platform Admin Credentials**:
   ```env
   PLATFORM_ADMIN_EMAIL=admin@yourdomain.com
   PLATFORM_ADMIN_PASSWORD=secure-password-here
   ```

---

## ✅ Summary

**Everything is already configured!** Just:

1. Make sure services are running
2. Open `http://localhost:5173/platform-admin/login`
3. Login with platform admin credentials
4. Start managing configurations!

The frontend automatically:
- ✅ Calls the gateway (port 4000)
- ✅ Gateway forwards to billing service (port 4005)
- ✅ Routes are correctly configured
- ✅ Authentication tokens are handled automatically

