# User Approval Status Sync Fix

## 🐛 Issue

When a user signs up and is in "pending" status waiting for admin approval:
1. User signs up → Status: "Pending"
2. Admin approves user in another tab → Backend database updated
3. **User's session is NOT updated** → Still shows "Pending"
4. User cannot upload files because frontend checks `user?.approved`
5. User must **logout and re-login** to see the approved status

This creates a poor user experience where approval doesn't take effect immediately.

## 🔍 Root Cause

The user's approval status is stored in `localStorage` when they login:

```typescript
// During login:
const user = {
  id: data.user.userId,
  name: data.user.name,
  email,
  role: data.user.role,
  tenantId,
  approved: data.user.approved,  // ❌ Stored once, never updated
};
localStorage.setItem('auth-user', JSON.stringify(user));
```

When the admin approves the user:
- ✅ Backend database is updated
- ❌ User's browser localStorage is NOT updated
- ❌ User's session remains "pending"

## ✅ Solution

Implemented a **real-time approval status checking system** with multiple mechanisms:

### 1. New `checkApprovalStatus()` Function
**File:** `Frontend/src/contexts/AuthContext.tsx`

```typescript
/**
 * Check if user's approval status has changed on the backend
 * and update the local session accordingly
 */
const checkApprovalStatus = async () => {
  if (!user || user.role === 'admin') {
    return; // Admins are always approved, no need to check
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/users/${user.id}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const isNowApproved = data.user?.status === 'active';
      
      // If approval status changed, update the session
      if (isNowApproved !== user.approved) {
        const updatedUser: AuthUser = {
          ...user,
          approved: isNowApproved,
          role: isNowApproved ? 'user' : 'pending',
        };
        persistUser(updatedUser);  // Update localStorage
        
        // Notify user of approval
        if (isNowApproved && !user.approved) {
          window.dispatchEvent(new CustomEvent('userApproved'));
        }
      }
    }
  } catch (error) {
    console.error('Failed to check approval status:', error);
  }
};
```

**What it does:**
- Fetches the user's current status from the backend
- Compares with the local session
- If status changed to "approved", updates localStorage
- Triggers a custom event for UI notification

### 2. Auto-Polling (Every 30 seconds)
**File:** `Frontend/src/pages/Dashboard.tsx`

```typescript
// Poll every 30 seconds while user is pending
const pollInterval = setInterval(() => {
  checkApprovalStatus();
}, 30000); // 30 seconds
```

**Why 30 seconds?**
- ✅ Fast enough for good UX (max 30s wait)
- ✅ Low server load (2 requests/minute per pending user)
- ✅ Battery-friendly on mobile devices

### 3. Tab Focus Detection
**File:** `Frontend/src/pages/Dashboard.tsx`

```typescript
// Check when tab gains focus
const handleFocus = () => {
  checkApprovalStatus();
};
window.addEventListener('focus', handleFocus);
```

**Scenario:**
- User has CloudDock open in background
- Admin approves user in another tab/window
- User returns to CloudDock tab
- ✅ Status is checked immediately when tab gains focus

### 4. Manual "Check Status" Button
**File:** `Frontend/src/pages/Dashboard.tsx`

```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => {
    checkApprovalStatus();
    toast({
      title: "Checking status...",
      description: "Verifying your approval status with the server.",
    });
  }}
>
  🔄 Check Status
</Button>
```

**User Experience:**
- Pending users see a yellow banner with a "Check Status" button
- Can manually trigger an immediate status check
- Shows loading toast while checking

### 5. Success Toast Notification

```typescript
// Listen for approval event
const handleApproval = () => {
  toast({
    title: "🎉 Account Approved!",
    description: "Your account has been approved! You can now upload files and folders.",
    duration: 5000,
  });
};
window.addEventListener('userApproved', handleApproval);
```

**Result:**
- User sees a celebratory toast notification when approved
- UI automatically updates (upload buttons become enabled)
- No need to logout/login!

## 🔄 Complete Flow

### Before Fix:
```
1. User signs up → Status: "Pending"
2. Admin approves in another tab → Backend updated
3. User's session → Still "Pending" ❌
4. User must logout and re-login → Status: "Approved" ✅
```

### After Fix:
```
1. User signs up → Status: "Pending"
2. User dashboard loads → Auto-check starts
3. Polling every 30 seconds
4. Admin approves in another tab → Backend updated
5. Within 0-30 seconds → Auto-check detects approval
   OR user clicks "Check Status" → Immediate check
   OR user switches tabs → Focus check
6. localStorage updated → Status: "Approved"
7. 🎉 Toast notification shown
8. Upload buttons enabled
9. ✅ User can upload immediately (no re-login needed!)
```

## 📊 Checking Mechanisms Summary

| Mechanism | Trigger | Delay | Best For |
|-----------|---------|-------|----------|
| **Immediate Check** | Dashboard loads | 0s | First-time detection |
| **Polling** | Every 30 seconds | 0-30s | Background monitoring |
| **Tab Focus** | User returns to tab | 0s | Multi-tab workflows |
| **Manual Button** | User clicks button | 0s | Impatient users 😊 |

## 🎯 User Experience Improvements

### Before:
❌ Approval requires logout/login  
❌ Confusing ("Why can't I upload?")  
❌ Poor multi-tab experience  
❌ No feedback when approved  

### After:
✅ Approval updates automatically  
✅ Clear pending status indicator  
✅ Manual check button available  
✅ Toast notification on approval  
✅ Works across multiple tabs  
✅ No re-login required  

## 🔧 Implementation Details

### Updated AuthContext Interface

```typescript
interface AuthContextType {
  user: AuthUser | null;
  usage: TenantUsage | null;
  signOut: () => void;
  signIn: (args: ...) => Promise<AuthUser>;
  signUpOrganization: (args: ...) => Promise<AuthUser>;
  signUpUser: (args: ...) => Promise<AuthUser>;
  approveUser: (userId: string) => Promise<void>;
  refresh: () => void;
  checkApprovalStatus: () => Promise<void>;  // ✨ NEW
}
```

### Updated Pending User Banner

```tsx
{!user?.approved && (
  <div className="glass-card rounded-2xl p-4 mb-4 border-l-4 border-yellow-500">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="animate-pulse">⏳</div>
        <div>
          <p className="text-sm font-medium">Account Pending Approval</p>
          <p className="text-xs text-muted-foreground">
            You can browse but uploading is disabled until an admin approves your account.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          checkApprovalStatus();
          toast({
            title: "Checking status...",
            description: "Verifying your approval status with the server.",
          });
        }}
        className="glass-card"
      >
        🔄 Check Status
      </Button>
    </div>
  </div>
)}
```

## 📝 Files Modified

1. **`Frontend/src/contexts/AuthContext.tsx`**
   - Added `checkApprovalStatus()` function
   - Added to AuthContextType interface
   - Dispatches `userApproved` custom event

2. **`Frontend/src/pages/Dashboard.tsx`**
   - Added auto-polling mechanism (30s interval)
   - Added tab focus detection
   - Added approval toast notification
   - Enhanced pending user banner with "Check Status" button

## 🧪 Testing Scenarios

### Test 1: Auto-Polling
1. **Setup:** User A signs up → Status: "Pending"
2. **Action:** Admin approves User A in another tab
3. **Wait:** Max 30 seconds
4. **Result:** ✅ Toast appears, upload buttons enabled

### Test 2: Tab Focus
1. **Setup:** User A signs up → Status: "Pending"
2. **Action:** User switches to another tab
3. **Action:** Admin approves User A
4. **Action:** User returns to CloudDock tab
5. **Result:** ✅ Immediate check, toast appears, upload enabled

### Test 3: Manual Check
1. **Setup:** User A signs up → Status: "Pending"
2. **Action:** Admin approves User A
3. **Action:** User clicks "Check Status" button
4. **Result:** ✅ Immediate check, toast appears, upload enabled

### Test 4: Multi-Tab Sync
1. **Setup:** User A opens CloudDock in 2 tabs → Both show "Pending"
2. **Action:** Admin approves User A
3. **Action:** User switches between tabs
4. **Result:** ✅ Both tabs update to "Approved" (via tab focus)

## 🚀 Deployment

**Frontend Changes Only** - No backend changes required!

```bash
cd Frontend
npm run build
# Deploy to Vercel (auto-deployment if connected to Git)
```

Or push to GitHub:
```bash
git add .
git commit -m "feat: Add real-time approval status checking for pending users"
git push origin main
```

## 💡 Future Enhancements

1. **WebSocket Integration** (Optional)
   - Real-time push notifications (0s delay)
   - More complex setup, better UX

2. **Service Worker Notifications** (Optional)
   - Browser notifications even when tab is closed
   - Requires user permission

3. **Configurable Polling Interval** (Optional)
   - Admin can set polling frequency per org
   - Balance between UX and server load

## 📊 Performance Impact

| Metric | Impact |
|--------|--------|
| **Server Load** | +0.033 req/s per pending user (2 req/min) |
| **Network Usage** | ~1 KB per check (negligible) |
| **Browser Performance** | Minimal (single interval timer) |
| **Battery Impact** | Low (30s polling is battery-friendly) |

## ✅ Summary

- ✅ Pending users no longer need to logout/login to see approval
- ✅ Status updates automatically within 30 seconds
- ✅ Manual check button for immediate verification
- ✅ Toast notification provides clear feedback
- ✅ Works across multiple tabs
- ✅ Minimal performance impact
- ✅ Better user experience overall

---

**Status:** ✅ Implemented and Ready for Testing  
**Date:** November 17, 2025  
**Priority:** High (User Experience Issue)  
**Type:** Feature Enhancement

