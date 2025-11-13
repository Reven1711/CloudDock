# 🔐 Required Environment Variables Checklist

## ✅ What Changed in docker-compose.yml

All hardcoded values have been replaced with `.env` variables:

### Fixed Variables:
1. ✅ `CORS_ORIGINS` - Now reads from `.env` (was hardcoded in all 7 services)
2. ✅ `NODE_ENV` - Now reads from `.env` with fallback to `production`
3. ✅ `PORT` - Now reads from `.env` with fallback to `4000`
4. ✅ `FRONTEND_URL` - Now reads from `.env` (was using fallback)
5. ✅ `AUTH_SERVICE_PORT` through `UI_SERVICE_PORT` - Now use `.env` variables
6. ✅ `AUTH_SERVICE_URL` through `UI_SERVICE_URL` - Now use `.env` variables with defaults

---

## 📋 REQUIRED Variables in Your `.env` File

Make sure your `Backend/microservices/.env` file contains **ALL** of these:

```bash
# ========================================
# CRITICAL - MUST BE IN .env FILE
# ========================================

# General Configuration
NODE_ENV=production
PORT=4000
CORS_ORIGINS=http://localhost:8080,http://localhost:5173,http://localhost:3000,http://localhost:4173

# MongoDB Configuration (YOUR REAL MONGODB ATLAS URI)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/CloudDock?retryWrites=true&w=majority
MONGODB_DB_NAME=CloudDock

# JWT Configuration (YOUR REAL SECRET)
JWT_SECRET=your-actual-jwt-secret-key

# AWS Configuration (YOUR REAL AWS CREDENTIALS)
AWS_ACCESS_KEY_ID=your-actual-aws-access-key
AWS_SECRET_ACCESS_KEY=your-actual-aws-secret-key
AWS_REGION=your-region
S3_BUCKET_NAME=your-bucket-name

# Virus Scanning (Optional)
ENABLE_VIRUS_SCAN=false
VIRUS_SCAN_LAMBDA=clouddock-virus-scanner

# Stripe Configuration (YOUR REAL STRIPE KEYS)
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret

# Frontend URL
FRONTEND_URL=http://localhost:8080

# ========================================
# OPTIONAL - Have Defaults in docker-compose.yml
# ========================================

# Service Ports (defaults: 4001, 4002, 4003, 4004, 4005, 4006)
AUTH_SERVICE_PORT=4001
ORG_SERVICE_PORT=4002
USER_SERVICE_PORT=4003
FILE_SERVICE_PORT=4004
BILLING_SERVICE_PORT=4005
UI_SERVICE_PORT=4006

# Gateway Service URLs (defaults provided for Docker networking)
AUTH_SERVICE_URL=http://auth-service:4001
ORG_SERVICE_URL=http://org-service:4002
USER_SERVICE_URL=http://user-service:4003
FILE_SERVICE_URL=http://files-service:4004
BILLING_SERVICE_URL=http://billing-service:4005
UI_SERVICE_URL=http://ui-service:4006
```

---

## 🚨 Critical Items to Replace

**DO NOT USE DUMMY VALUES** - Replace these with your actual credentials:

1. **MONGODB_URI** - Your MongoDB Atlas connection string
2. **JWT_SECRET** - Generate a secure random string
3. **AWS_ACCESS_KEY_ID** & **AWS_SECRET_ACCESS_KEY** - Your AWS IAM credentials
4. **S3_BUCKET_NAME** - Your actual S3 bucket name
5. **STRIPE_SECRET_KEY** - Your Stripe secret key from dashboard
6. **STRIPE_WEBHOOK_SECRET** - Your Stripe webhook secret

---

## 🔍 How to Verify Your .env File

Run this command to check if all required variables are set:

```bash
# Windows (PowerShell)
Get-Content Backend\microservices\.env | Select-String "MONGODB_URI|JWT_SECRET|AWS_ACCESS_KEY_ID|STRIPE_SECRET_KEY|CORS_ORIGINS"

# Windows (CMD)
findstr "MONGODB_URI JWT_SECRET AWS_ACCESS_KEY_ID STRIPE_SECRET_KEY CORS_ORIGINS" Backend\microservices\.env
```

---

## ✅ Summary of Changes

| Service | Previous | Now |
|---------|----------|-----|
| **Gateway** | Hardcoded CORS_ORIGINS | `${CORS_ORIGINS}` from .env |
| **Gateway** | Hardcoded Service URLs | `${*_SERVICE_URL}` with defaults |
| **All Services** | Hardcoded NODE_ENV | `${NODE_ENV:-production}` |
| **All Services** | Hardcoded Service Ports | `${*_SERVICE_PORT}` with defaults |
| **Billing** | Hardcoded FRONTEND_URL | `${FRONTEND_URL}` from .env |

---

## 🎯 Next Steps

1. ✅ Verify your `.env` file has all REQUIRED variables
2. ✅ Replace all dummy values with real credentials
3. ✅ Run `docker-compose down` to stop old containers
4. ✅ Run `docker-compose up -d` to start with new configuration
5. ✅ Test health endpoints
6. ✅ Test frontend connectivity

