# Local Development Setup Guide

## 🔄 How Frontend Connects to Backend Services

---

## 📊 **Connection Flow**

### **Local Development Architecture:**

```
Frontend (Vite Dev Server)          Backend (Docker Containers)
     localhost:5173                      localhost:4000
          │                                    │
          │    API Calls via                  │
          │    VITE_API_BASE_URL              │
          │                                    │
          └──────────────────────────────────►│
              http://localhost:4000           │
                                              │
                                         ┌────▼─────┐
                                         │  Gateway │
                                         │   :4000  │
                                         └────┬─────┘
                                              │
                    ┌─────────────────────────┼──────────────────────────┐
                    │                         │                          │
              ┌─────▼──────┐         ┌───────▼────────┐      ┌─────────▼─────────┐
              │   Auth     │         │     Files      │      │      User         │
              │  :4001     │         │     :4004      │      │     :4003         │
              └────────────┘         └────────────────┘      └───────────────────┘
                                               │
                                     (with security fixes)
```

---

## 🔧 **Frontend Configuration**

### **How It Works:**

Your frontend uses the `VITE_API_BASE_URL` environment variable:

```typescript
// Frontend/src/services/fileService.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Frontend makes calls like:
await axios.get(`${API_BASE_URL}/files/org/${orgId}`);
// → http://localhost:4000/files/org/admincorp
```

### **Environment Variables:**

**For Local Development** (`.env.local`):
```bash
VITE_API_BASE_URL=http://localhost:4000
```

**For Production** (`.env.production`):
```bash
VITE_API_BASE_URL=https://gateway-481097781746.asia-south1.run.app
```

---

## 🐳 **Docker Compose Setup**

### **Service Ports Mapping:**

When you run `docker-compose up`, services are exposed on localhost:

| Service | Internal Port | Exposed on Localhost | Access From Frontend |
|---------|---------------|---------------------|---------------------|
| **Gateway** | 4000 | `localhost:4000` | ✅ **This is what frontend calls** |
| Auth Service | 4001 | `localhost:4001` | ❌ Goes through gateway |
| Org Service | 4002 | `localhost:4002` | ❌ Goes through gateway |
| User Service | 4003 | `localhost:4003` | ❌ Goes through gateway |
| Files Service | 4004 | `localhost:4004` | ❌ Goes through gateway |
| Billing Service | 4005 | `localhost:4005` | ❌ Goes through gateway |
| UI Service | 4006 | `localhost:4006` | ❌ Goes through gateway |

**Important:** Frontend **ONLY** calls the **Gateway** at `localhost:4000`

---

## 🚀 **Step-by-Step: Running Locally**

### **Step 1: Create Frontend .env.local**

```bash
cd Frontend
```

Create `Frontend/.env.local`:
```bash
# Local development API endpoint
VITE_API_BASE_URL=http://localhost:4000

# Other environment variables (if needed)
VITE_STRIPE_PUBLIC_KEY=your_stripe_key
```

### **Step 2: Start Backend Services**

```bash
cd Backend/microservices

# Start all services with Docker Compose
docker-compose up -d

# Or start them individually
docker-compose up -d gateway
docker-compose up -d auth-service
docker-compose up -d files-service
docker-compose up -d user-service
docker-compose up -d org-service
docker-compose up -d billing-service
docker-compose up -d ui-service
```

**Verify services are running:**
```bash
docker-compose ps
```

Expected output:
```
NAME                        IMAGE                    STATUS
clouddock-gateway           clouddock-gateway        Up 2 minutes
clouddock-auth-service      clouddock-auth-service   Up 2 minutes
clouddock-files-service     clouddock-files-service  Up 2 minutes
clouddock-user-service      clouddock-user-service   Up 2 minutes
...
```

### **Step 3: Start Frontend Dev Server**

```bash
cd Frontend
npm run dev
```

Output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### **Step 4: Test Connection**

Open browser: `http://localhost:5173`

**Frontend makes API call:**
```typescript
// Frontend code:
fetch('http://localhost:4000/auth/login', { ... })
```

**Gateway receives request:**
```
Gateway (localhost:4000)
  ↓
Routes to → http://auth-service:4001/auth/login
  ↓
Auth Service processes request
  ↓
Returns response to Gateway
  ↓
Gateway returns to Frontend
```

---

## 🌐 **Production vs Local**

### **Production (Current):**

```typescript
// Frontend on Vercel
https://clouddock-frontend.vercel.app
  ↓
VITE_API_BASE_URL=https://gateway-481097781746.asia-south1.run.app
  ↓
Gateway on GCP Cloud Run
  ↓
Services on GCP Cloud Run
```

### **Local Development:**

```typescript
// Frontend on localhost
http://localhost:5173
  ↓
VITE_API_BASE_URL=http://localhost:4000
  ↓
Gateway in Docker
  ↓
Services in Docker
```

---

## 📝 **Example API Calls**

### **Frontend Code:**

```typescript
// The frontend doesn't know about individual services
// It ONLY knows about the gateway URL

// 1. Login
await fetch('http://localhost:4000/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password, orgId })
});

// 2. Get Files (with security fix)
await axios.get('http://localhost:4000/files/org/admincorp', {
  params: { userId: 'user_123', folder: '/' }
});

// 3. Check User Approval Status
await fetch('http://localhost:4000/users/user_123');

// 4. Upload File
await axios.post('http://localhost:4000/files/upload', formData);
```

### **Gateway Routes to Services:**

```javascript
// Gateway automatically routes based on path:
/auth/*    → http://auth-service:4001
/users/*   → http://user-service:4003
/files/*   → http://files-service:4004
/org/*     → http://org-service:4002
/billing/* → http://billing-service:4005
/ui/*      → http://ui-service:4006
```

---

## 🔒 **Testing the Security Fix Locally**

### **Scenario: Two Users in Same Org**

**Step 1: User A Uploads Files**
```bash
# User A logs in
curl http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"userA@admincorp.com","password":"pass","orgId":"admincorp"}'

# User A uploads file
# File stored with uploadedBy.userId = "user_admincorp_A"
```

**Step 2: User B Uploads Files**
```bash
# User B logs in
curl http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"userB@admincorp.com","password":"pass","orgId":"admincorp"}'

# User B uploads file
# File stored with uploadedBy.userId = "user_admincorp_B"
```

**Step 3: Verify Isolation**
```bash
# User A gets files (should ONLY see their own)
curl "http://localhost:4000/files/org/admincorp?userId=user_admincorp_A"
# Returns: User A's files only ✅

# User B gets files (should ONLY see their own)
curl "http://localhost:4000/files/org/admincorp?userId=user_admincorp_B"
# Returns: User B's files only ✅
```

---

## 🛠️ **Troubleshooting**

### **Issue 1: "Failed to fetch" or "Network Error"**

**Symptoms:**
```
Failed to fetch http://localhost:4000/auth/login
```

**Solutions:**

1. **Check if backend is running:**
```bash
docker-compose ps
curl http://localhost:4000/health
```

2. **Check CORS configuration:**
```bash
# Gateway should allow localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

3. **Restart services:**
```bash
docker-compose restart gateway
```

---

### **Issue 2: "CORS Policy Error"**

**Symptoms:**
```
Access to fetch at 'http://localhost:4000' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Solution:**

Update `Backend/microservices/gateway/src/index.js`:
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',  // ← Add this
    'http://localhost:3000',
    'https://clouddock-frontend.vercel.app'
  ],
  credentials: true
}));
```

Rebuild and restart:
```bash
docker-compose build gateway
docker-compose up -d gateway
```

---

### **Issue 3: "Cannot connect to MongoDB"**

**Symptoms:**
```
MongooseError: failed to connect to MongoDB
```

**Solution:**

Ensure `MONGODB_URI` is set in `.env`:
```bash
# Backend/microservices/.env
MONGODB_URI=mongodb+srv://your-cluster.mongodb.net/CloudDock
```

Restart services:
```bash
docker-compose down
docker-compose up -d
```

---

### **Issue 4: Frontend uses wrong API URL**

**Symptoms:**
Frontend calls production URL instead of localhost

**Solution:**

1. Create `Frontend/.env.local` (overrides other .env files):
```bash
VITE_API_BASE_URL=http://localhost:4000
```

2. Restart Vite dev server:
```bash
# Ctrl+C to stop
npm run dev
```

3. Verify in browser console:
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
// Should output: "http://localhost:4000"
```

---

## 📊 **Complete Local Setup Commands**

```bash
# 1. Setup Backend
cd Backend/microservices

# Create .env file with your credentials
cat > .env << EOF
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your_bucket_name
STRIPE_SECRET_KEY=your_stripe_key
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
EOF

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# 2. Setup Frontend
cd ../../Frontend

# Create .env.local
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:4000
EOF

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# 3. Test
# Open http://localhost:5173 in browser
# Try logging in, uploading files, etc.
```

---

## 🎯 **Summary**

### **How It Works:**

1. ✅ Frontend runs on `localhost:5173` (Vite)
2. ✅ Frontend calls `localhost:4000` (Gateway)
3. ✅ Gateway routes to individual services
4. ✅ Services run in Docker containers
5. ✅ All communicate via Docker network

### **Key Points:**

- ✅ Frontend **ONLY** calls the Gateway
- ✅ Gateway is exposed on `localhost:4000`
- ✅ Individual services are NOT directly accessed by frontend
- ✅ Use `.env.local` to configure `VITE_API_BASE_URL`
- ✅ Security fixes are in the Docker images you just built

### **URLs You Need:**

| Environment | Frontend URL | Backend URL (Gateway) |
|-------------|--------------|----------------------|
| **Local Dev** | `http://localhost:5173` | `http://localhost:4000` |
| **Production** | `https://clouddock-frontend.vercel.app` | `https://gateway-481097781746.asia-south1.run.app` |

---

**Ready to test?** Start the backend with `docker-compose up -d` and the frontend with `npm run dev`! 🚀

