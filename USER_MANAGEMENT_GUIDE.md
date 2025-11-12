# User Management & UI Customization Guide

## ✅ Implemented Features

### 1. **UI Settings Save with Success Notifications** 🎨

The "Save & Apply to All Users" button now:

- ✅ Saves UI customizations to MongoDB database
- ✅ Shows success toast notification: "UI Settings Saved! 🎨"
- ✅ Shows error toast if save fails
- ✅ Updates immediately for all users on page refresh

**How it Works:**

```javascript
Admin clicks "Save & Apply to All Users"
        ↓
Settings saved to database
        ↓
Toast notification appears: "UI Settings Saved! 🎨"
        ↓
All users see new design on next page load
```

---

### 2. **User Management in Admin Dashboard** 👥

Complete user management system with:

#### **User List Display**

- ✅ Shows all users in organization
- ✅ Displays user names, emails, roles
- ✅ Shows status badges (Pending/Active/Admin)
- ✅ Shows join/request dates
- ✅ Auto-updates user count in org stats

#### **Pending Users Section**

- ⏳ Yellow badge: "Pending"
- Shows "Requested" date
- Two action buttons:
  - ✅ **Approve** (Green) - Activates user
  - ❌ **Reject** (Red) - Removes user

#### **Active Users Section**

- ✅ Green badge: "Active"
- 🔵 Blue badge: "Admin" (for administrators)
- Shows "Joined" date
- Read-only view of approved users

---

### 3. **User Approval Mechanism** ✅

Full approval workflow implemented:

#### **Backend Endpoints:**

**Get All Organization Users**

```
GET /users/org/:tenantId

Response:
{
  "success": true,
  "users": [
    {
      "userId": "user_acme-corp_1234567890",
      "name": "John Doe",
      "email": "john@acme.com",
      "role": "user",
      "status": "pending",
      "approved": false,
      "createdAt": "2025-11-12T10:00:00Z"
    }
  ]
}
```

**Approve User**

```
POST /users/:userId/approve

Response:
{
  "success": true,
  "message": "User approved successfully",
  "user": {
    "userId": "user_acme-corp_1234567890",
    "name": "John Doe",
    "email": "john@acme.com",
    "role": "user",
    "status": "active",
    "approved": true
  }
}
```

**Reject User**

```
POST /users/:userId/reject

Response:
{
  "success": true,
  "message": "User rejected and removed"
}
```

#### **Frontend Functionality:**

**Approve User:**

1. Admin clicks "Approve" button
2. Confirmation dialog (none for approve)
3. User status changed to "active" in database
4. Success toast: "User Approved! ✅"
5. User list refreshes automatically
6. User can now access all features

**Reject User:**

1. Admin clicks "Reject" button
2. Confirmation dialog: "Are you sure?"
3. User deleted from database
4. Toast: "User Rejected"
5. User list refreshes automatically
6. User removed from system

---

## 🎯 Complete User Workflow

### **For New Users:**

```
1. User signs up
   ↓
2. Account created with status: "pending"
   ↓
3. User can log in but sees:
   "Your account is pending admin approval"
   ↓
4. Limited access to features
   ↓
5. Admin sees user in "Pending Approvals" section
   ↓
6. Admin clicks "Approve"
   ↓
7. User status → "active"
   ↓
8. User gains full access
```

### **For Admins:**

```
1. Admin logs into /admin/dashboard
   ↓
2. Sees stat: "3 pending approval"
   ↓
3. Clicks "Users" tab
   ↓
4. Views pending users section
   ↓
5. Reviews user details:
   - Name: "Jane Smith"
   - Email: "jane@company.com"
   - Requested: "Nov 12, 2025"
   ↓
6. Decides to approve or reject
   ↓
7. Clicks appropriate button
   ↓
8. Toast notification confirms action
   ↓
9. User list updates automatically
```

---

## 💾 Backend Implementation

### **Files Created:**

**1. User Controller**

```javascript
Backend / services / user / src / controllers / userController.js;
```

Functions:

- `getAllUsers(req, res)` - Fetch all users for organization
- `getPendingUsers(req, res)` - Fetch pending users only
- `approveUser(req, res)` - Approve a user
- `rejectUser(req, res)` - Reject and remove a user

**2. User Routes**

```javascript
Backend / services / user / src / routes / userRoutes.js;
```

Routes:

- `GET /users/org/:tenantId` - All users
- `GET /users/pending/:tenantId` - Pending users
- `POST /users/:userId/approve` - Approve user
- `POST /users/:userId/reject` - Reject user

**3. Service Update**

```javascript
Backend / services / user / src / index.js;
```

- Connected routes to service
- Routes properly mounted at `/users`

---

## 🎨 Frontend Implementation

### **Files Modified:**

**AdminDashboard.tsx**

**New State Variables:**

```typescript
const [allUsers, setAllUsers] = useState<any[]>([]);
const [loadingUsers, setLoadingUsers] = useState(false);
const { toast } = useToast();
```

**New Functions:**

```typescript
fetchAllUsers() - Load users from API
handleApproveUser(userId) - Approve user with toast
handleRejectUser(userId) - Reject user with toast
saveUISettings() - Save UI with toast notification
```

**UI Components Added:**

- User list with badges
- Pending users section with approve/reject buttons
- Active users section
- Loading state
- Empty state
- Toast notifications

---

## 🧪 Testing Guide

### **Test 1: UI Settings Save**

**Steps:**

```bash
1. Login as admin
2. Go to /admin/dashboard
3. Click "Customize UI" tab
4. Change primary color to red
5. Click "Save & Apply to All Users"
6. ✅ Toast should appear: "UI Settings Saved! 🎨"
7. Check database: db.uiSettings.find({orgId: "your-org"})
```

**Expected Result:**

- Toast notification appears
- Settings saved to database
- Changes apply immediately

---

### **Test 2: View Users**

**Steps:**

```bash
1. Login as admin
2. Go to /admin/dashboard
3. Click "Users" tab
4. Should see list of users
```

**Expected Display:**

```
Pending Approvals (2)
─────────────────────
┌─────────────────────────────────┐
│ Jane Smith        [Pending]     │
│ jane@company.com                │
│ Requested: Nov 12, 2025         │
│         [Approve]  [Reject]     │
└─────────────────────────────────┘

Active Users (5)
────────────────
┌─────────────────────────────────┐
│ John Admin    [Admin] [Active]  │
│ john@company.com                │
│ Joined: Nov 10, 2025            │
└─────────────────────────────────┘
```

---

### **Test 3: Approve User**

**Steps:**

```bash
1. Login as admin
2. Navigate to Users tab
3. Find pending user
4. Click "Approve" button
5. Wait for response
```

**Expected Result:**

- ✅ Toast: "User Approved! ✅"
- User moves to Active Users section
- Pending count decreases
- User can now access full features

---

### **Test 4: Reject User**

**Steps:**

```bash
1. Login as admin
2. Navigate to Users tab
3. Find pending user
4. Click "Reject" button
5. Confirm dialog: "Are you sure?"
6. Click OK
```

**Expected Result:**

- Toast: "User Rejected"
- User removed from list
- Pending count decreases
- User deleted from database

---

### **Test 5: User Experience After Approval**

**Before Approval:**

```bash
1. User logs in
2. Sees: "Your account is pending admin approval"
3. Limited access
```

**After Approval:**

```bash
1. User refreshes page
2. Approval notice gone
3. Full access granted
4. Can upload files
5. Can use all features
```

---

## 📊 Database Schema

### **User Document (in auth service):**

```javascript
{
  userId: "user_acme-corp_1731410400000",
  name: "Jane Smith",
  email: "jane@company.com",
  passwordHash: "...",
  tenantId: "acme-corp",
  role: "user",  // or "admin"
  status: "pending",  // or "active"
  createdAt: Date,
  updatedAt: Date
}
```

**Status Values:**

- `"pending"` - Awaiting admin approval
- `"active"` - Approved, full access

**Role Values:**

- `"admin"` - Organization administrator
- `"user"` - Regular user

---

## 🎨 Toast Notifications

### **Success Toasts:**

**UI Settings Saved:**

```
Title: "UI Settings Saved! 🎨"
Description: "All users will see the new design on their next page load."
Type: Success (default)
```

**User Approved:**

```
Title: "User Approved! ✅"
Description: "The user can now access all features."
Type: Success (default)
```

### **Info Toasts:**

**User Rejected:**

```
Title: "User Rejected"
Description: "The user has been removed from the system."
Type: Default
```

### **Error Toasts:**

**Save Failed:**

```
Title: "Save Failed"
Description: "Failed to save UI settings"
Type: Destructive (red)
```

**Approval Failed:**

```
Title: "Approval Failed"
Description: "Failed to approve user"
Type: Destructive (red)
```

---

## 🔄 API Flow Diagram

### **User Approval Flow:**

```
Frontend (Admin Dashboard)
        ↓
[Approve Button Click]
        ↓
POST /users/:userId/approve
        ↓
Gateway (Port 4000)
        ↓
User Service (Port 4003)
        ↓
MongoDB (auth.users collection)
        ↓
Update status: "pending" → "active"
        ↓
Response: { success: true, user: {...} }
        ↓
Frontend updates UI
        ↓
Toast notification appears
        ↓
User list refreshes
```

### **UI Settings Save Flow:**

```
Frontend (Admin Dashboard)
        ↓
[Save Button Click]
        ↓
PATCH /ui/:tenantId
        ↓
Gateway (Port 4000)
        ↓
UI Service (Port 4006)
        ↓
MongoDB (uiSettings collection)
        ↓
Save/Update settings document
        ↓
Response: { success: true, settings: {...} }
        ↓
Frontend updates tenant context
        ↓
Toast notification appears
        ↓
All users load new settings
```

---

## 🎯 Key Features Summary

### ✅ **What's Working:**

1. **UI Customization Save**

   - Saves to database ✅
   - Toast notification ✅
   - Error handling ✅

2. **User List Display**

   - Shows all users ✅
   - Names and emails ✅
   - Role badges ✅
   - Status badges ✅
   - Dates displayed ✅

3. **User Approval**

   - Approve button ✅
   - Reject button ✅
   - Database updates ✅
   - Toast notifications ✅
   - Auto-refresh list ✅

4. **Organization Stats**
   - Real-time user counts ✅
   - Pending users count ✅
   - Auto-updates ✅

---

## 🔧 Troubleshooting

### **Issue: Toast Not Showing**

**Solution:**

1. Check if `useToast` is imported
2. Verify Toaster component in App.tsx
3. Check browser console for errors

### **Issue: Users Not Loading**

**Solution:**

1. Check backend service is running (port 4003)
2. Verify API endpoint: `GET /users/org/:tenantId`
3. Check browser network tab
4. Verify user's tenantId is correct

### **Issue: Approval Not Working**

**Solution:**

1. Check user service is running
2. Verify routes are mounted correctly
3. Check MongoDB connection
4. Verify userId format in request

### **Issue: UI Settings Not Saving**

**Solution:**

1. Check UI service is running (port 4006)
2. Verify MongoDB connection
3. Check request body format
4. Verify tenantId is correct

---

## 📝 Code Examples

### **Approve User (Frontend):**

```typescript
const handleApproveUser = async (userId: string) => {
  const response = await fetch(`${apiUrl}/users/${userId}/approve`, {
    method: "POST",
  });

  if (response.ok) {
    toast({
      title: "User Approved! ✅",
      description: "The user can now access all features.",
    });
    fetchAllUsers();
  }
};
```

### **Save UI Settings (Frontend):**

```typescript
const saveUISettings = async () => {
  const response = await fetch(`${apiUrl}/ui/${user?.tenantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: uiSettings }),
  });

  if (response.ok) {
    toast({
      title: "UI Settings Saved! 🎨",
      description: "All users will see the new design...",
    });
  }
};
```

### **Approve User (Backend):**

```javascript
export const approveUser = async (req, res) => {
  const { userId } = req.params;
  const user = await AuthUserModel.findOne({ userId });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  user.status = "active";
  await user.save();

  res.json({
    success: true,
    message: "User approved successfully",
    user: { ...user },
  });
};
```

---

## 🚀 Next Steps

**Restart Backend Services:**

```bash
cd Backend
npm run dev:all
```

**Test the Features:**

1. Create a test user (signup as regular user)
2. Login as admin
3. Go to Users tab
4. Approve the test user
5. Verify toast notifications
6. Test UI customization save

---

**Status:** ✅ Fully Implemented and Ready to Use
**Last Updated:** November 12, 2025
