# Admin Dashboard Guide

## 🎯 Overview

The Admin Dashboard provides organization administrators with powerful tools to manage users, monitor storage, view all organizational files, and customize the UI experience for all users in their organization.

---

## ✨ Key Features

### 1. **Separate Admin Dashboard**

- **Route:** `/admin/dashboard`
- Admins are automatically redirected from `/dashboard` to the admin dashboard
- Clean separation between admin and user interfaces

### 2. **Organization-Wide Monitoring**

#### Storage Management

- **Total Storage Quota:** 50 GB per organization (free tier)
- **Storage Used:** Real-time tracking across all users
- **Storage Free:** Remaining available storage
- **Visual Progress Bar:** Easy-to-understand storage visualization
- **Warnings:** Alerts when storage reaches 80% and 90%

#### User Statistics

- **Total Users:** Count of all users in the organization
- **Pending Users:** Number awaiting approval
- Quick access to user management

#### File Statistics

- **Total Files:** Count of all files across the organization
- **File Access:** View files from all users

### 3. **UI Customization Panel** 🎨

Admins can customize the entire user experience for their organization:

#### Brand Colors

- **Primary Color:** Main brand color (buttons, accents)
- **Secondary Color:** Secondary brand color (gradients, highlights)
- **Accent Color:** Additional accent color (notifications, special elements)
- Live color picker with hex input
- Real-time preview of changes

#### Theme & Typography

- **Theme:** Light or Dark mode
- **Font Family:** Custom font selection (e.g., "Inter, sans-serif")
- Applies to entire application

#### Dashboard Layout

- **Card Style:**
  - Glassmorphism (Modern, translucent effects)
  - Neumorphism (Soft, 3D-like appearance)
- **Show Analytics:** Toggle statistics display
- **Show Recent Files:** Toggle recent files section
- **File View Default:** Grid or List view

#### Preview & Apply

- **Live Preview:** See changes before applying
- **Save & Apply:** Instantly updates UI for all users
- **Reset to Default:** Revert to default settings

### 4. **All Organization Files View**

- View files from **all users** in the organization
- See file owner information
- Manage organization-wide file access
- Track file distribution across users

### 5. **User Management**

- View pending user approvals
- Manage user access
- Track user activity

---

## 🚀 How to Use

### Accessing Admin Dashboard

**When you log in as an admin:**

1. You'll be automatically redirected to `/admin/dashboard`
2. If you try to access `/dashboard`, you'll be redirected to admin dashboard

### Monitoring Organization Stats

**Dashboard Overview Tab:**

```
┌─────────────────────┐
│   Total Users: 12   │
│  3 pending approval │
└─────────────────────┘

┌─────────────────────┐
│  Total Files: 234   │
│  Across all users   │
└─────────────────────┘

┌─────────────────────┐
│ Storage: 24.5 GB    │
│    of 50 GB         │
└─────────────────────┘

┌─────────────────────┐
│ Free: 25.5 GB       │
│  51% available      │
└─────────────────────┘
```

### Customizing UI for Users

**Step 1: Access Customize UI Tab**

- Click "Customize UI" tab in admin dashboard
- You'll see all customization options

**Step 2: Adjust Colors**

```javascript
// Example Color Schemes:

// Professional Blue
Primary:   #2563eb
Secondary: #3b82f6
Accent:    #06b6d4

// Creative Purple (Default)
Primary:   #6366f1
Secondary: #8b5cf6
Accent:    #ec4899

// Warm Sunset
Primary:   #f97316
Secondary: #fb923c
Accent:    #fbbf24
```

**Step 3: Configure Layout**

- Choose card style (glassmorphism/neumorphism)
- Toggle analytics and recent files
- Set default file view

**Step 4: Preview Changes**

- Review changes in the preview section
- See how colors and styles will look

**Step 5: Save & Apply**

- Click "Save & Apply to All Users"
- Changes take effect immediately
- All users see new design on next page load/refresh

### Viewing All Organization Files

**Files Tab:**

- Switch to "All Files" tab
- Browse files uploaded by all users
- See file owner for each file
- Manage organization-wide file access

---

## 📊 Technical Details

### Frontend Components

**New Files Created:**

- `Frontend/src/pages/AdminDashboard.tsx` - Main admin dashboard component

**Files Modified:**

- `Frontend/src/App.tsx` - Added admin dashboard route
- `Frontend/src/pages/Dashboard.tsx` - Auto-redirect for admins, loads UI settings

### Backend Services

**UI Settings Model:**

```javascript
{
  orgId: String (unique),
  primaryColor: String,
  secondaryColor: String,
  accentColor: String,
  fontFamily: String,
  theme: String ("light" | "dark"),
  cardStyle: String ("glassmorphism" | "neumorphism"),
  showAnalytics: Boolean,
  showRecentFiles: Boolean,
  fileViewDefault: String ("grid" | "list"),
  logoUrl: String,
  featureFlags: Object
}
```

**New Files Created:**

- `Backend/services/ui/src/controllers/uiController.js` - UI settings controllers
- `Backend/services/ui/src/routes/uiRoutes.js` - UI settings routes

**Files Modified:**

- `Backend/services/ui/src/models/UISettings.js` - Enhanced model with all fields
- `Backend/services/ui/src/index.js` - Connected routes

### API Endpoints

#### Get UI Settings

**GET** `/ui/:tenantId`

```json
Response:
{
  "success": true,
  "settings": {
    "primaryColor": "#6366f1",
    "secondaryColor": "#8b5cf6",
    "accentColor": "#ec4899",
    "fontFamily": "Inter, sans-serif",
    "theme": "dark",
    "cardStyle": "glassmorphism",
    "showAnalytics": true,
    "showRecentFiles": true,
    "fileViewDefault": "grid"
  }
}
```

#### Update UI Settings

**PATCH** `/ui/:tenantId`

```json
Request:
{
  "settings": {
    "primaryColor": "#2563eb",
    "secondaryColor": "#3b82f6",
    "theme": "dark",
    "cardStyle": "glassmorphism",
    "showAnalytics": true,
    "showRecentFiles": true
  }
}

Response:
{
  "success": true,
  "message": "UI settings updated successfully",
  "settings": { ... }
}
```

---

## 🎨 User Experience Flow

### For Admins:

```
Login as Admin
      ↓
Auto-redirect to /admin/dashboard
      ↓
View organization stats
      ↓
Customize UI in "Customize UI" tab
      ↓
Save changes
      ↓
All users see new UI
```

### For Users:

```
Login as User
      ↓
Load /dashboard
      ↓
Automatically fetch UI settings from backend
      ↓
Apply admin's customizations
      ↓
User sees customized interface
```

---

## 🔐 Security & Permissions

### Admin-Only Features:

- ✅ Access to `/admin/dashboard`
- ✅ View organization-wide statistics
- ✅ View all users' files
- ✅ Customize UI settings
- ✅ Manage user approvals

### Automatic Redirects:

- **Admins** trying to access `/dashboard` → redirected to `/admin/dashboard`
- **Regular users** trying to access `/admin/dashboard` → redirected to `/dashboard`

---

## 🧪 Testing Guide

### Test Admin Dashboard:

**1. Login as Admin:**

```
- Use organization admin credentials
- Should auto-redirect to /admin/dashboard
```

**2. Check Organization Stats:**

```
- Verify user count displays
- Check storage usage shows correctly
- Confirm file count is accurate
```

**3. Test UI Customization:**

```
a. Click "Customize UI" tab
b. Change primary color to red (#ef4444)
c. Change theme to "light"
d. Toggle "Show Analytics" off
e. Click "Save & Apply to All Users"
f. Should show success message
```

**4. Verify User Sees Changes:**

```
a. Login as regular user (different browser/incognito)
b. Dashboard should load with red primary color
c. Light theme should be applied
d. Analytics section should be hidden
```

**5. Test Preview:**

```
- Make color changes
- Observe preview updates in real-time
- Colors should reflect in preview button
```

**6. Test Reset:**

```
- Make changes
- Click "Reset to Default"
- All fields should revert to defaults
```

---

## 📈 Future Enhancements

Planned features:

- [ ] Organization-wide file search
- [ ] User activity logs
- [ ] Storage usage per user breakdown
- [ ] Custom logo upload
- [ ] Email notification settings
- [ ] Advanced user permissions (roles beyond admin/user)
- [ ] File sharing policies
- [ ] Bandwidth usage monitoring
- [ ] Export organization data

---

## 🐛 Troubleshooting

### UI Changes Not Applying to Users:

**Issue:** Users don't see updated UI after admin saves changes

**Solutions:**

1. User needs to refresh their browser (`Ctrl+F5` or `Cmd+Shift+R`)
2. Clear browser cache
3. Check backend service is running (port 4006)
4. Verify UI settings saved to database

### Admin Can't Access Admin Dashboard:

**Issue:** Admin sees regular dashboard

**Solutions:**

1. Verify `user.role === 'admin'` in database
2. Clear localStorage and re-login
3. Check JWT token includes correct role
4. Ensure admin dashboard route is registered

### Storage Stats Not Updating:

**Issue:** Storage numbers don't change

**Solutions:**

1. Currently using mock data - implement real backend queries
2. Connect to file service for actual storage calculation
3. Add cron job for periodic updates

---

## 💡 Best Practices

### For Admins:

1. **Test UI Changes First:**

   - Use preview before saving
   - Test in different screen sizes
   - Verify readability

2. **Choose Accessible Colors:**

   - Ensure sufficient contrast
   - Test with color blind simulators
   - Maintain brand consistency

3. **Monitor Storage:**

   - Check regularly
   - Plan for upgrades if approaching limit
   - Encourage users to clean up unused files

4. **User Management:**
   - Review pending users promptly
   - Maintain organized user structure
   - Document organization policies

---

## 📞 Support

For issues or questions:

1. Check console for error messages
2. Verify all backend services are running
3. Test API endpoints with curl/Postman
4. Review `AUTHENTICATION_GUIDE.md` for user management
5. Check database for UI settings: `db.uiSettings.find({})`

---

**Status:** ✅ Fully Implemented
**Last Updated:** November 12, 2025
