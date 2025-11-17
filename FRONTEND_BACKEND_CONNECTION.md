# Frontend-Backend Connection Guide

## 🎯 Overview

**Frontend**: Runs on `http://localhost:8080`  
**Backend Gateway**: Runs on `http://localhost:4000`  
**Backend Services**: Run on ports 4001-4006 (via Docker)

---

## 📊 Connection Flow

```
┌─────────────────────────────────────┐
│  Frontend (localhost:8080)         │
│  - React App                        │
│  - Vite Dev Server                  │
└─────────────────────────────────────┘
              ↓
    API Calls: http://localhost:4000
              ↓
┌─────────────────────────────────────┐
│  Gateway (localhost:4000)           │
│  - Routes requests to services      │
│  - Handles CORS                     │
└─────────────────────────────────────┘
              ↓
    Forwards to appropriate service
              ↓
┌─────────────────────────────────────┐
│  Microservices (Docker)             │
│  - Auth: 4001                       │
│  - Org: 4002                        │
│  - User: 4003                       │
│  - Files: 4004                      │
│  - Billing: 4005                   │
│  - UI: 4006                         │
└─────────────────────────────────────┘
```

---

## ✅ Configuration

### 1. Frontend Configuration

**File**: `Frontend/src/services/platformAdminService.ts` (and other services)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
```

**This means:**
- Frontend calls: `http://localhost:4000/billing/platform-admin/login`
- If `VITE_API_BASE_URL` is set in `.env`, it uses that
- Otherwise defaults to `http://localhost:4000` (gateway)

**Optional**: Create `Frontend/.env` file:
```env
VITE_API_BASE_URL=http://localhost:4000
```

### 2. Gateway CORS Configuration

**File**: `Backend/microservices/gateway/src/index.js`

```javascript
const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:8080,http://localhost:5173")
```

**This means:**
- Gateway allows requests from `localhost:8080` (your frontend)
- Also allows `localhost:5173` (Vite default)
- Can be overridden with `CORS_ORIGINS` environment variable

### 3. Docker Compose Environment

**File**: `Backend/microservices/docker-compose.yml`

The gateway reads `CORS_ORIGINS` from environment variables. To set it:

**Option A**: Set in your shell before running docker-compose:
```bash
export CORS_ORIGINS="http://localhost:8080,http://localhost:5173"
docker-compose up -d
```

**Option B**: Create `.env` file in `Backend/microservices/`:
```env
CORS_ORIGINS=http://localhost:8080,http://localhost:5173
```

**Option C**: Use the default (already configured in code):
- Default includes both `localhost:8080` and `localhost:5173`
- No additional configuration needed!

---

## 🚀 How It Works

### Example: Platform Admin Login

1. **User visits**: `http://localhost:8080/platform-admin/login`

2. **User clicks "Login"**

3. **Frontend makes API call**:
   ```typescript
   POST http://localhost:4000/billing/platform-admin/login
   {
     "email": "admin@clouddock.com",
     "password": "admin123"
   }
   ```

4. **Gateway receives request**:
   - Checks CORS: ✅ `localhost:8080` is allowed
   - Routes to: `http://billing-service:4005/billing/platform-admin/login`

5. **Billing service processes**:
   - Validates credentials
   - Returns JWT token

6. **Frontend receives response**:
   - Stores token in `localStorage`
   - Redirects to dashboard

---

## 🧪 Testing the Connection

### Test 1: Check Gateway is Running

```bash
curl http://localhost:4000/health
```

**Expected**: `{"ok":true,"services":{...}}`

### Test 2: Check CORS from Frontend

Open browser console on `http://localhost:8080` and run:

```javascript
fetch('http://localhost:4000/billing/pricing')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected**: Should return pricing data (no CORS error)

### Test 3: Test Platform Admin Login

```bash
curl -X POST http://localhost:4000/billing/platform-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clouddock.com", "password": "admin123"}'
```

**Expected**: Returns token and user info

---

## 🐛 Troubleshooting

### Issue: "CORS Error" in Browser Console

**Symptoms**: 
```
Access to fetch at 'http://localhost:4000/...' from origin 'http://localhost:8080' 
has been blocked by CORS policy
```

**Solution**:
1. Check gateway logs: `docker logs clouddock-gateway`
2. Verify CORS includes `localhost:8080`
3. Restart gateway: `docker-compose restart gateway`

### Issue: "Network Error" or "Failed to fetch"

**Symptoms**: Request fails completely

**Solution**:
1. Check gateway is running: `docker ps | grep gateway`
2. Check gateway port: `curl http://localhost:4000/health`
3. Verify frontend is calling correct URL (check browser Network tab)

### Issue: "404 Not Found"

**Symptoms**: API endpoint not found

**Solution**:
1. Check route exists in gateway: `Backend/microservices/gateway/src/index.js`
2. Check service is running: `docker ps`
3. Check service logs: `docker logs clouddock-billing-service`

---

## 📝 Summary

✅ **Frontend** (port 8080) → Calls → **Gateway** (port 4000)  
✅ **Gateway** → Routes → **Microservices** (ports 4001-4006)  
✅ **CORS** configured to allow `localhost:8080`  
✅ **API Base URL** defaults to `http://localhost:4000`

**Everything is configured!** Just:
1. Start Docker services: `docker-compose up -d`
2. Start frontend: `npm run dev` (runs on port 8080)
3. Access: `http://localhost:8080/platform-admin/login`

---

## 🔧 Quick Reference

| Component | Port | URL |
|-----------|------|-----|
| Frontend | 8080 | http://localhost:8080 |
| Gateway | 4000 | http://localhost:4000 |
| Auth Service | 4001 | http://localhost:4001 |
| Org Service | 4002 | http://localhost:4002 |
| User Service | 4003 | http://localhost:4003 |
| Files Service | 4004 | http://localhost:4004 |
| Billing Service | 4005 | http://localhost:4005 |
| UI Service | 4006 | http://localhost:4006 |

**Frontend should ONLY call the Gateway (4000), never the services directly!**

