# Cloud Run File Upload Fix - 413 Error Solution

## 🚨 Problem

**Error:** `413 Content Too Large` + CORS error when uploading files > 32MB

### Root Cause

**Cloud Run has a hard limit of 32MB for HTTP request bodies.**

```
Your 100MB file → Cloud Run (32MB limit) → ❌ Rejected
                                         ↓
                              No CORS headers added
                                         ↓
                                You see both errors
```

The request never reaches your application, so CORS headers are never set.

---

## 💡 Solution: Direct S3 Upload

Upload files **directly from browser to S3**, bypassing Cloud Run entirely.

### How It Works

```
┌─────────┐                                    ┌─────────┐
│ Browser │                                    │  Cloud  │
│         │                                    │   Run   │
└────┬────┘                                    └────┬────┘
     │                                              │
     │ 1. Request presigned URL                     │
     ├─────────────────────────────────────────────>│
     │                                              │
     │ 2. Return presigned URL + fileId             │
     │<─────────────────────────────────────────────┤
     │                                              │
     │                   ┌─────────┐                │
     │ 3. Upload directly│   S3    │                │
     ├──────────────────>│ Bucket  │                │
     │    (PUT request)  └─────────┘                │
     │                                              │
     │ 4. Confirm upload complete                   │
     ├─────────────────────────────────────────────>│
     │                                              │
     │ 5. File record created                       │
     │<─────────────────────────────────────────────┤
     │                                              │
```

### Benefits

✅ **No Cloud Run size limits** - Upload files up to 5TB  
✅ **Faster uploads** - No double network hop through backend  
✅ **Lower costs** - No backend compute time for file transfer  
✅ **Better UX** - Native browser upload with progress  
✅ **More reliable** - No server memory issues  

---

## 🔧 Implementation

### Backend Changes (Already Done ✅)

**Files Added:**
- `Backend/microservices/files-service/src/controllers/presignedUploadController.js`

**Routes Added:**
- `POST /files/upload/presigned` - Get presigned URL for direct S3 upload
- `POST /files/upload/confirm` - Confirm upload complete
- `POST /files/upload/cancel` - Cancel failed upload

**API Endpoints:**

#### 1. Get Presigned URL
```javascript
POST /files/upload/presigned

Request Body:
{
  "fileName": "large-video.mp4",
  "fileSize": 104857600, // 100 MB in bytes
  "mimeType": "video/mp4",
  "orgId": "your-org-id",
  "userId": "user-id",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "folder": "/videos/"
}

Response:
{
  "success": true,
  "fileId": "uuid-here",
  "presignedUrl": "https://s3.amazonaws.com/...",
  "s3Key": "orgId/folder/timestamp-uuid-filename",
  "expiresIn": 900,
  "message": "Upload directly to this URL using PUT request"
}
```

#### 2. Confirm Upload
```javascript
POST /files/upload/confirm

Request Body:
{
  "fileId": "uuid-from-step-1",
  "orgId": "your-org-id"
}

Response:
{
  "success": true,
  "message": "File upload confirmed",
  "file": { ... }
}
```

---

## 📱 Frontend Implementation

### Step 1: Create Upload Service

Create `Frontend/src/services/directUploadService.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface PresignedUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  orgId: string;
  userId: string;
  userName: string;
  userEmail: string;
  folder?: string;
}

interface PresignedUploadResponse {
  success: boolean;
  fileId: string;
  presignedUrl: string;
  s3Key: string;
  expiresIn: number;
}

/**
 * Upload large file directly to S3 (bypasses Cloud Run 32MB limit)
 */
export const uploadLargeFile = async (
  file: File,
  metadata: Omit<PresignedUploadRequest, 'fileName' | 'fileSize' | 'mimeType'>,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; fileId: string }> => {
  try {
    // Step 1: Get presigned URL from backend
    const presignedResponse = await axios.post<PresignedUploadResponse>(
      `${API_BASE_URL}/files/upload/presigned`,
      {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        ...metadata,
      }
    );

    const { fileId, presignedUrl } = presignedResponse.data;

    // Step 2: Upload directly to S3 using presigned URL
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    // Step 3: Confirm upload with backend
    await axios.post(`${API_BASE_URL}/files/upload/confirm`, {
      fileId,
      orgId: metadata.orgId,
    });

    return { success: true, fileId };
  } catch (error) {
    console.error('Direct upload failed:', error);
    throw error;
  }
};

/**
 * Determine if file should use direct S3 upload
 * Use direct upload for files > 30MB to avoid Cloud Run limits
 */
export const shouldUseDirectUpload = (fileSize: number): boolean => {
  const DIRECT_UPLOAD_THRESHOLD = 30 * 1024 * 1024; // 30 MB
  return fileSize > DIRECT_UPLOAD_THRESHOLD;
};
```

### Step 2: Update FileUploadDialog Component

Update `Frontend/src/components/FileUploadDialog.tsx`:

```typescript
import { uploadLargeFile, shouldUseDirectUpload } from '@/services/directUploadService';

// In your upload handler:
const handleUpload = async () => {
  if (!selectedFiles.length || !user) return;

  setUploading(true);
  setError(null);

  try {
    for (const file of selectedFiles) {
      const fileSize = file.size;
      
      // Check if file should use direct S3 upload
      if (shouldUseDirectUpload(fileSize)) {
        console.log(`Using direct S3 upload for ${file.name} (${fileSize} bytes)`);
        
        // Upload directly to S3
        await uploadLargeFile(
          file,
          {
            orgId: user.tenantId,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            folder: currentFolder,
          },
          (progress) => {
            console.log(`Upload progress: ${progress}%`);
            // Update progress in UI
          }
        );
        
        toast({
          title: "Upload successful",
          description: `${file.name} uploaded successfully`,
        });
      } else {
        // Use existing upload method for small files (< 30MB)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('orgId', user.tenantId);
        formData.append('userId', user.id);
        formData.append('userName', user.name);
        formData.append('userEmail', user.email);
        formData.append('folder', currentFolder);

        await uploadFile(formData);
      }
    }

    onUploadSuccess();
    onOpenChange(false);
  } catch (err) {
    console.error('Upload error:', err);
    setError('Upload failed. Please try again.');
  } finally {
    setUploading(false);
  }
};
```

---

## 🚀 Deployment Steps

### 1. Commit Backend Changes

```bash
cd E:\SEM-7\cloud\cloudDock\CloudDock
git add Backend/microservices/files-service/
git commit -m "feat: Add direct S3 upload for files > 32MB

- Add presignedUploadController for direct S3 uploads
- Bypasses Cloud Run 32MB request limit
- Supports files up to 5TB
- Adds /files/upload/presigned endpoint
- Adds /files/upload/confirm endpoint
- Adds /files/upload/cancel endpoint"
git push origin main
```

### 2. Rebuild and Deploy Files-Service

```bash
cd Backend\microservices\files-service

# Build new image
gcloud builds submit --tag asia-south1-docker.pkg.dev/clouddock-project/clouddock-repo/files-service:latest

# Deploy to Cloud Run
gcloud run deploy files-service \
  --image asia-south1-docker.pkg.dev/clouddock-project/clouddock-repo/files-service:latest \
  --platform managed \
  --region asia-south1
```

### 3. Update Frontend

Add the direct upload service and update the upload dialog as shown above.

### 4. Test

1. Try uploading a file < 30MB → Uses existing upload (through Cloud Run)
2. Try uploading a file > 30MB → Uses direct S3 upload
3. Try uploading 100MB file → Should work! ✅

---

## 📊 Comparison

| Feature | Current (via Cloud Run) | Direct S3 Upload |
|---------|------------------------|------------------|
| **Max File Size** | 32 MB (Cloud Run limit) | 5 TB (S3 limit) |
| **Upload Speed** | Slower (double hop) | Faster (direct) |
| **Server Load** | High (file passes through) | Low (just metadata) |
| **Memory Usage** | High (file in memory) | None |
| **Cost** | Higher (compute time) | Lower (no compute) |
| **Progress Tracking** | Limited | Native browser support |
| **Network Efficiency** | 2x bandwidth used | 1x bandwidth used |

---

## 🎯 Quick Fix Summary

**Problem:**  
- Cloud Run blocks uploads > 32MB with `413 Content Too Large`
- CORS error appears because request never reaches app

**Solution:**  
- Implement direct S3 upload using presigned URLs
- Small files (< 30MB) → Use existing upload
- Large files (≥ 30MB) → Use direct S3 upload

**Benefits:**  
- ✅ Supports files up to 5TB
- ✅ Faster uploads
- ✅ Lower costs
- ✅ Better UX

---

## 🔍 Alternative Solutions

### Option 2: Chunked Upload (Complex)

Upload file in small chunks (5MB each), reassemble on server.

**Pros:** Works with Cloud Run  
**Cons:** Complex implementation, slower, more server load

### Option 3: Increase to Google Cloud Storage (GCS)

Switch from Cloud Run to Cloud Storage signed URLs.

**Pros:** Google-native solution  
**Cons:** Need to migrate from S3 to GCS

---

## ✅ Recommendation

**Use Direct S3 Upload (Option 1)** - It's the industry standard solution used by:
- Dropbox
- Google Drive
- AWS Console
- GitHub

It's battle-tested, efficient, and solves your problem perfectly!

---

**Status:** Backend implementation complete ✅  
**Next Step:** Implement frontend direct upload service  
**ETA:** 30 minutes to implement + test

