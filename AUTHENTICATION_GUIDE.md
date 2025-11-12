# CloudDock Authentication System Guide

## Overview

CloudDock now has a complete multi-tenant authentication system with support for organization admins and regular users.

---

## ✅ Features Implemented

### 1. **Logout Functionality** ✨ FIXED

- Logout button now properly redirects to home page (`/`)
- Clears user session from localStorage
- Located in the user dropdown menu in the dashboard header

### 2. **Organization Signup** ✅

- Create a new organization with an admin account
- Automatically creates the organization in the database
- Admin user is approved immediately

### 3. **User Signup** ✅ NEW

- Join an existing organization as a regular user
- User account starts in "pending" status
- Requires admin approval before full access

### 4. **Organization Sign In** ✅

- Admins can sign in by providing:
  - Organization name
  - Email
  - Password

### 5. **User Sign In** ✅ NEW

- Regular users can sign in by:
  - Selecting organization from dropdown
  - Email
  - Password

---

## 🚀 How to Use

### **For Organization Admins:**

#### Creating a New Organization:

1. Go to the signup page
2. Click the **"Organization"** tab
3. Fill in:
   - Admin Name (your name)
   - Company Name (e.g., "Acme Corp")
   - Email
   - Password
4. Click "Create Account"
5. You'll be logged in as an admin immediately

#### Signing In (Organization Admin):

1. Go to the login page
2. Click **"Org Sign In"**
3. Enter:
   - Organization Name (e.g., "acme-corp")
   - Your admin email
   - Your password
4. Click "Sign In"

---

### **For Regular Users:**

#### Joining an Organization:

1. Go to the signup page
2. Click the **"User"** tab
3. Select your organization from the dropdown
4. Fill in:
   - Your full name
   - Email
   - Password
5. Click "Create Account"
6. ⚠️ Your account will be **pending** until approved by an admin

#### Signing In (Regular User):

1. Go to the login page
2. Click **"User Sign In"**
3. Select your organization from the dropdown
4. Enter:
   - Your email
   - Your password
5. Click "Sign In"

---

## 🔐 Authentication Flow

```
┌─────────────────┐
│  Organization   │
│     Signup      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Org +    │
│  Admin User     │
│  (Approved)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Dashboard     │
│  (Full Access)  │
└─────────────────┘


┌─────────────────┐
│   User Signup   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create User    │
│   (Pending)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Wait for Admin  │
│    Approval     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Dashboard     │
│ (Limited Access)│
└─────────────────┘
```

---

## 📋 API Endpoints

### Organization Signup

**POST** `/auth/org/signup`

```json
{
  "orgName": "Acme Corp",
  "adminName": "John Doe",
  "adminEmail": "john@acme.com",
  "password": "securepassword"
}
```

### User Signup

**POST** `/auth/user/signup`

```json
{
  "orgId": "acme-corp",
  "name": "Jane Smith",
  "email": "jane@acme.com",
  "password": "securepassword"
}
```

### Sign In (Both Org Admin & User)

**POST** `/auth/login`

```json
{
  "orgId": "acme-corp",
  "email": "user@acme.com",
  "password": "securepassword"
}
```

### Logout

**POST** `/auth/logout`

- Returns success message
- Frontend clears session and redirects to home

---

## 🎨 UI Components

### Auth Page Modes:

1. **Organization Signup** - Create new organization
2. **User Signup** - Join existing organization
3. **Organization Sign In** - Admin login with org name
4. **User Sign In** - User login with org selection

### Dashboard Header:

- User dropdown showing:
  - User name and role
  - **Logout button** (now working correctly)

---

## 🔧 Technical Details

### Frontend Files Modified:

- `Frontend/src/contexts/AuthContext.tsx` - Added logout redirect
- `Frontend/src/pages/Auth.tsx` - Added user sign-in organization selector

### Backend Files (Already Working):

- `Backend/services/auth/src/controllers/authController.js` - All endpoints
- `Backend/services/auth/src/routes/authRoutes.js` - Routes configured
- `Backend/gateway/src/index.js` - CORS and proxying configured

### User Roles:

- **admin** - Organization administrator (approved automatically)
- **user** - Regular user (requires approval)

### User Status:

- **active** - Can access all features
- **pending** - Waiting for admin approval

---

## 🧪 Testing Guide

### Test Organization Signup:

1. Open browser to `http://localhost:8080`
2. Go to signup page
3. Select "Organization" tab
4. Enter test data:
   - Admin Name: "Test Admin"
   - Company Name: "Test Company 2025"
   - Email: "admin@test2025.com"
   - Password: "testpass123"
5. Submit - should redirect to dashboard

### Test User Signup:

1. Create an organization first (see above)
2. Log out
3. Go to signup page
4. Select "User" tab
5. Select the organization you created
6. Enter test data:
   - Name: "Test User"
   - Email: "user@test2025.com"
   - Password: "testpass123"
7. Submit - should redirect to dashboard (pending status)

### Test Sign In:

1. Log out from dashboard
2. Try signing in with created credentials
3. Should redirect to dashboard

### Test Logout:

1. From dashboard, click user avatar in top-right
2. Click "Logout"
3. Should redirect to home page (`/`)

---

## ⚠️ Important Notes

1. **Organization Names** are converted to slugs (lowercase, dashes instead of spaces)

   - "Acme Corp" → "acme-corp"

2. **Pending Users** can sign in but may have limited functionality until approved

3. **CORS Configuration** - Ensure backend is running on port 4000 and frontend on 8080

4. **Session Storage** - User data is stored in localStorage

5. **JWT Tokens** - Tokens expire after 7 days

---

## 🐛 Troubleshooting

### Logout doesn't redirect:

- ✅ **FIXED** - Now redirects to home page automatically

### Can't sign up:

- Check if organization name already exists
- Ensure all required fields are filled
- Check browser console for errors

### User sign-in not showing organization list:

- ✅ **FIXED** - Organization dropdown now appears for user sign-in

### CORS errors:

- ✅ **FIXED** - Gateway properly configured
- Ensure backend services are running

---

## 🎯 Next Steps (Future Enhancements)

- [ ] Admin approval workflow UI
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] User management dashboard for admins
- [ ] Role-based access control (RBAC) refinements

---

## 📞 Support

If you encounter any issues:

1. Check browser console for errors
2. Check backend logs
3. Verify all services are running
4. Ensure database connection is active

---

**System Status:** ✅ Fully Functional
**Last Updated:** November 12, 2025
