# Platform Admin Database Implementation

## ✅ What Was Changed

Platform admin credentials are now stored in **MongoDB database** instead of hardcoded values.

---

## 📊 Database Schema

### Collection: `platformadmins`

```javascript
{
  _id: ObjectId,
  email: String (unique, indexed, lowercase),
  passwordHash: String (bcrypt hashed),
  name: String,
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔐 Default Credentials

When the billing service starts, it automatically creates a default platform admin:

- **Email**: `admin@clouddock.com`
- **Password**: `admin123`
- **Name**: "Platform Administrator"

**Note**: These can be changed via environment variables:
```env
PLATFORM_ADMIN_EMAIL=your-email@clouddock.com
PLATFORM_ADMIN_PASSWORD=your-secure-password
```

---

## 🚀 How It Works

### 1. Service Startup

When the billing service starts:
```javascript
await PlatformAdminModel.initializeDefaultAdmin();
```

This:
- Checks if admin with email exists
- If not, creates new admin with hashed password
- If exists and `PLATFORM_ADMIN_PASSWORD` is set, updates password
- Logs: `✅ Default platform admin created: admin@clouddock.com`

### 2. Login Process

```javascript
// 1. Find admin in database
const admin = await PlatformAdminModel.findByEmail(email);

// 2. Verify password
const isValid = await admin.verifyPassword(password);

// 3. Update last login
admin.lastLogin = new Date();
await admin.save();

// 4. Generate JWT token
const token = jwt.sign({...}, JWT_SECRET);
```

### 3. Password Security

- Passwords are hashed using `bcrypt` (10 rounds)
- Never stored in plain text
- Password hash is never returned in API responses

---

## 📝 API Endpoints

### Public Endpoints

#### Login
```http
POST /billing/platform-admin/login
Content-Type: application/json

{
  "email": "admin@clouddock.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "...",
    "email": "admin@clouddock.com",
    "name": "Platform Administrator",
    "role": "platform-admin",
    "isPlatformAdmin": true
  }
}
```

#### Verify Token
```http
GET /billing/platform-admin/verify
Authorization: Bearer <token>
```

---

### Protected Endpoints (Require Platform Admin Auth)

#### Get All Platform Admins
```http
GET /billing/platform-admin/admins
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "admins": [
    {
      "id": "...",
      "email": "admin@clouddock.com",
      "name": "Platform Administrator",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create New Platform Admin
```http
POST /billing/platform-admin/admins
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newadmin@clouddock.com",
  "password": "secure-password",
  "name": "New Admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Platform admin created successfully",
  "admin": {
    "id": "...",
    "email": "newadmin@clouddock.com",
    "name": "New Admin",
    "isActive": true
  }
}
```

---

## 🔍 Database Queries

### View Platform Admins in MongoDB

```javascript
// Connect to MongoDB
use CloudDock

// View all platform admins (passwords are hashed)
db.platformadmins.find().pretty()

// Find specific admin
db.platformadmins.findOne({ email: "admin@clouddock.com" })

// Count admins
db.platformadmins.countDocuments({ isActive: true })
```

### Update Admin Password (via code)

```javascript
const { PlatformAdminModel } = require('./models/PlatformAdmin');

await PlatformAdminModel.createOrUpdateAdmin(
  'admin@clouddock.com',
  'new-password',
  'Platform Administrator'
);
```

---

## 🔒 Security Features

1. **Password Hashing**: All passwords are bcrypt hashed (10 rounds)
2. **Email Uniqueness**: Database enforces unique email constraint
3. **Case Insensitive**: Emails are stored in lowercase
4. **Active Status**: Admins can be deactivated (`isActive: false`)
5. **Last Login Tracking**: Tracks when admins last logged in
6. **Password Never Returned**: Password hash is never sent in API responses

---

## 🛠️ Management

### Change Default Admin Password

**Option 1: Environment Variable**
```env
PLATFORM_ADMIN_PASSWORD=new-secure-password
```
Restart billing service - password will be updated automatically.

**Option 2: API Call**
```bash
# Login first
TOKEN=$(curl -X POST http://localhost:4000/billing/platform-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clouddock.com", "password": "admin123"}' \
  | jq -r '.token')

# Update password
curl -X POST http://localhost:4000/billing/platform-admin/admins \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@clouddock.com",
    "password": "new-password",
    "name": "Platform Administrator"
  }'
```

### Create Additional Admins

```bash
# Login
TOKEN=$(curl -X POST http://localhost:4000/billing/platform-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clouddock.com", "password": "admin123"}' \
  | jq -r '.token')

# Create new admin
curl -X POST http://localhost:4000/billing/platform-admin/admins \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@clouddock.com",
    "password": "secure-password-123",
    "name": "Second Admin"
  }'
```

---

## ✅ Verification

### Check Admin Exists in Database

```bash
# View billing service logs
docker logs clouddock-billing-service | grep "platform admin"

# Should show:
# ✅ Default platform admin created: admin@clouddock.com
```

### Test Login

```bash
curl -X POST http://localhost:4000/billing/platform-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clouddock.com", "password": "admin123"}'
```

**Expected**: Returns token and user info (success!)

---

## 📋 Summary

✅ **Platform admins stored in MongoDB**  
✅ **Passwords hashed with bcrypt**  
✅ **Default admin auto-created on startup**  
✅ **Can create multiple admins via API**  
✅ **Password updates via environment variables**  
✅ **Last login tracking**  
✅ **Secure - passwords never exposed**

**Database Collection**: `platformadmins`  
**Default Email**: `admin@clouddock.com`  
**Default Password**: `admin123`

