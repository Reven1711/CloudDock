# Platform Admin Guide - Billing Configuration Management

## Overview

The CloudDock platform has **two separate admin roles**:

1. **Organization Admin** (`role: "admin"`) - Customers who manage their organization
   - Cannot modify billing prices or system configurations
   - Can manage their organization's files, users, and storage

2. **Platform Admin** (`role: "platform-admin"`) - CloudDock platform administrators
   - Can modify system-wide configurations like pricing
   - Separate authentication system
   - Only CloudDock staff should have access

## Why This Separation?

Organization admins are **customers being billed**. They should NOT be able to change their own pricing or system limits. Only CloudDock platform administrators should have this privilege.

## Platform Admin Access

### Default Credentials (Development)

- **Email**: `admin@clouddock.com`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change these in production using environment variables:
- `PLATFORM_ADMIN_EMAIL`
- `PLATFORM_ADMIN_PASSWORD`

### Environment Variables

Add to your `.env` file:

```env
PLATFORM_ADMIN_EMAIL=your-platform-admin@clouddock.com
PLATFORM_ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-key
```

## How to Access Platform Admin Dashboard

1. Navigate to: `http://localhost:5173/platform-admin/login`
2. Login with platform admin credentials
3. You'll be redirected to the Platform Admin Dashboard

## What Can Platform Admins Do?

### 1. View All System Configurations
- See all pricing, limits, and feature configurations
- View update history (who changed what and when)

### 2. Update Pricing
- Change `storage_price_per_gb` (e.g., from $0.20 to $0.25)
- Change `storage_minimum_purchase_gb`
- All changes affect all organizations immediately

### 3. Update System Limits
- Modify `storage_free_tier_gb`
- Change `storage_max_file_size_mb`
- Adjust `storage_expiry_days`

## API Endpoints

### Public Endpoints (No Auth Required)
- `GET /billing/pricing` - Get current pricing (used by customers)

### Platform Admin Endpoints (Auth Required)
- `POST /billing/platform-admin/login` - Platform admin login
- `GET /billing/platform-admin/verify` - Verify platform admin token
- `GET /billing/config` - Get all configurations
- `GET /billing/config/category/:category` - Get configs by category
- `GET /billing/config/:key` - Get specific configuration
- `PUT /billing/config/:key` - Update configuration

## Example: Changing Storage Price

### Via Frontend UI:
1. Login to Platform Admin Dashboard
2. Find "Pricing Configurations" section
3. Click "Edit" on `storage_price_per_gb`
4. Change value (e.g., from `0.2` to `0.25`)
5. Click "Save"

### Via API:
```bash
# Login first
curl -X POST http://localhost:4000/billing/platform-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@clouddock.com", "password": "admin123"}'

# Use the token from response, then update config
curl -X PUT http://localhost:4000/billing/config/storage_price_per_gb \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"value": 0.25, "description": "Updated price per GB"}'
```

## Security Features

1. **Separate Authentication**: Platform admin uses different login than organization admin
2. **Role-Based Access**: Only `platform-admin` or `super-admin` roles can access
3. **Token Verification**: All config endpoints verify platform admin token
4. **Audit Trail**: All changes are logged with who made the change and when

## Frontend Routes

- `/platform-admin/login` - Platform admin login page
- `/platform-admin/dashboard` - Platform admin dashboard (protected)

## Testing

1. Try accessing `/platform-admin/dashboard` without login → Should redirect to login
2. Login as organization admin → Should NOT be able to access platform admin dashboard
3. Login as platform admin → Should be able to view and edit configurations

## Important Notes

- ⚠️ **Pricing changes affect ALL organizations immediately**
- ⚠️ **Changes are permanent** (until changed again)
- ⚠️ **No undo** - Be careful when updating pricing
- ✅ **Changes are logged** - You can see who changed what
- ✅ **Token expires in 24 hours** - Platform admin sessions are shorter for security

## Default Configurations

When the billing service starts, it initializes these defaults:

- `storage_price_per_gb`: 0.2 ($0.20 per GB)
- `storage_minimum_purchase_gb`: 3 GB
- `storage_free_tier_gb`: 1 GB
- `storage_max_file_size_mb`: 100 MB
- `storage_expiry_days`: 30 days

These can all be modified via the Platform Admin Dashboard.

