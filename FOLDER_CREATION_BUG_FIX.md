# Folder Creation Bug Fix

## Issue
**Problem**: Creating a folder would fail with a 500 Internal Server Error, showing "Failed to create folder - Folder creation failed" even when trying to create a folder with a unique name.

**Root Cause**: 
1. The duplicate folder check was incorrect - it was checking `folder: folderPath` (e.g., `"/test/"`) instead of `folder: parentFolder` (e.g., `"/"`).
2. This caused the check to never find existing folders, allowing duplicate creation attempts.
3. MongoDB then threw a duplicate key error (code 11000) on the `s3Key` unique index.
4. The catch block didn't handle the duplicate key error gracefully, resulting in a generic 500 error.

## Error Details
```
MongoServerError: E11000 duplicate key error collection: CloudDock.files 
index: s3Key_1 dup key: { s3Key: "admincorp//test/" }
```

## Solution

### Backend Changes

#### 1. Fixed Duplicate Check Logic
**Before:**
```javascript
const existingFolder = await FileModel.findOne({
  orgId,
  folder: folderPath,  // ❌ Wrong - checking the new folder path
  fileName: folderName,
  mimeType: "application/vnd.clouddock.folder",
  isDeleted: false,
});
```

**After:**
```javascript
const existingFolder = await FileModel.findOne({
  orgId,
  folder: parentFolder,  // ✅ Correct - checking the parent folder
  fileName: folderName,
  mimeType: "application/vnd.clouddock.folder",
  isDeleted: false,
});
```

#### 2. Improved Error Response
**Before:**
```javascript
if (existingFolder) {
  return res.status(400).json({
    error: "A folder with this name already exists",
  });
}
```

**After:**
```javascript
if (existingFolder) {
  return res.status(409).json({  // 409 Conflict is more appropriate
    error: "A folder with this name already exists in this location",
    existingFolder: {
      fileId: existingFolder.fileId,
      folderName: existingFolder.fileName,
    },
  });
}
```

#### 3. Added Duplicate Key Error Handling
**Added to catch block:**
```javascript
catch (error) {
  console.error("Folder creation error:", error);
  
  // Handle MongoDB duplicate key error as fallback
  if (error.code === 11000) {
    return res.status(409).json({
      error: "A folder with this name already exists in this location",
      message: "Please choose a different folder name",
    });
  }
  
  res.status(500).json({
    error: "Folder creation failed",
    message: error.message,
  });
}
```

## Files Modified

### Backend (Microservices)
- ✅ `Backend/microservices/files-service/src/controllers/fileController.js`
  - Fixed duplicate check from `folder: folderPath` → `folder: parentFolder`
  - Changed status code from 400 → 409 (Conflict)
  - Added MongoDB duplicate key error handling (code 11000)

### Backend (Legacy)
- ✅ `Backend/services/files/src/controllers/fileController.js`
  - Applied identical fixes for consistency

### Frontend
- ✅ No changes needed - already handles error messages properly via:
  ```typescript
  error.response?.data?.error || error.message
  ```

## Testing

### Test Case 1: Create New Folder (Success)
1. Click "New Folder" button
2. Enter name: "Documents"
3. Click "Create Folder"
4. **Expected**: ✅ Success message, folder appears in list

### Test Case 2: Create Duplicate Folder (Now Fixed)
1. Click "New Folder" button
2. Enter name: "test" (already exists)
3. Click "Create Folder"
4. **Before Fix**: ❌ "Failed to create folder - Folder creation failed"
5. **After Fix**: ✅ "A folder with this name already exists in this location"

### Test Case 3: Create Folder in Subfolder
1. Navigate into a folder (e.g., `/Documents/`)
2. Click "New Folder"
3. Enter name: "Projects"
4. **Expected**: ✅ Folder created at `/Documents/Projects/`

## HTTP Status Codes

Changed status codes for better REST API compliance:

| Scenario | Before | After | Reason |
|----------|--------|-------|--------|
| Duplicate folder | 400 Bad Request | **409 Conflict** | More semantically correct |
| MongoDB duplicate | 500 Internal Error | **409 Conflict** | Handled gracefully |

## Deployment

### Local Development (Completed)
```bash
cd Backend/microservices
docker-compose build files-service
docker-compose up -d files-service
```

### Production (GCP Cloud Run)
```bash
cd Backend/microservices/files-service
gcloud builds submit --tag gcr.io/project-clouddock/files-service
gcloud run deploy files-service \
  --image gcr.io/project-clouddock/files-service \
  --region asia-south1
```

## Verification

✅ Docker container rebuilt and restarted
✅ Service logs show successful startup:
```
✅ MongoDB connected
✅ Collections ensured
✅ Worker Pool initialized with 21 workers
🚀 [Files Service] listening on :4004
```

## Try It Now!

1. Go to `http://localhost:8080`
2. Try to create a folder named "test" again
3. You should now see: **"A folder with this name already exists in this location"** instead of a 500 error
4. Change the name to something else (e.g., "test2")
5. It should create successfully!

---

**Status**: ✅ Fixed and Deployed Locally
**Date**: November 17, 2024
**Issue**: Folder creation 500 error
**Resolution**: Fixed duplicate check logic + added error handling

