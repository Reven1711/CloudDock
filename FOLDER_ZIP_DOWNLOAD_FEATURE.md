# Folder ZIP Download Feature

## Overview
Added the ability to download entire folders as ZIP archives for both regular users and admins. This feature recursively packs all files and subfolders into a single downloadable ZIP file.

## What's New

### Backend Changes

#### 1. New Controller: `folderDownloadController.js`
- **Location**: 
  - `Backend/microservices/files-service/src/controllers/folderDownloadController.js`
  - `Backend/services/files/src/controllers/folderDownloadController.js`
  
- **Function**: `downloadFolderAsZip()`
  - Fetches folder record from database
  - Recursively retrieves all files in the folder (and subfolders)
  - Checks for infected files (blocks download if any found)
  - Streams files from S3
  - Creates ZIP archive on-the-fly using `archiver`
  - Streams ZIP directly to client

```javascript
export const downloadFolderAsZip = async (req, res) => {
  // 1. Get folder record
  // 2. Find all files recursively
  // 3. Check virus scan status
  // 4. Create ZIP archive
  // 5. Stream to client
};
```

#### 2. New S3 Service Function
- **Location**: 
  - `Backend/microservices/files-service/src/services/s3Service.js`
  - `Backend/services/files/src/services/s3Service.js`

- **Function**: `getS3Object()`
  - Returns full S3 object (including Body stream)
  - Used for adding files to ZIP archive

#### 3. New Route
- **Endpoint**: `GET /files/folder/:folderId/download`
- **Query Parameters**:
  - `orgId` (required): Organization ID
  - `userId` (optional): User ID for filtering

#### 4. New Dependency
- **Package**: `archiver@^7.0.1`
- **Purpose**: Create ZIP archives on-the-fly
- **Added to**:
  - `Backend/package.json`
  - `Backend/microservices/files-service/package.json`

### Frontend Changes

#### 1. New Service Function
- **Location**: `Frontend/src/services/fileService.ts`
- **Function**: `downloadFolderAsZip()`
  - Calls backend endpoint with `responseType: 'blob'`
  - Creates download link programmatically
  - Triggers browser download

```typescript
export const downloadFolderAsZip = async (
  folderId: string,
  folderName: string,
  orgId: string,
  userId?: string
): Promise<void> => {
  // 1. Request ZIP from backend
  // 2. Create blob URL
  // 3. Trigger download
  // 4. Clean up
};
```

#### 2. Admin Dashboard Updates
- **Location**: `Frontend/src/pages/AdminDashboard.tsx`
- **New Handler**: `handleDownloadFolder()`
- **UI Changes**: Added download button (📥) next to delete button (🗑️) on all folder cards
- **Applies to**: All 4 view layouts (Large Icons, List, Details, Tiles)

#### 3. User Dashboard Updates
- **Location**: `Frontend/src/pages/Dashboard.tsx`
- **New Handler**: `handleFolderDownload()`
- **Passed to**: `FileItemCard` component via `onFolderDownload` prop

#### 4. FileItemCard Component Updates
- **Location**: `Frontend/src/components/dashboard/FileItemCard.tsx`
- **New Prop**: `onFolderDownload?: (fileId: string, folderName: string) => void`
- **UI Changes**: Added download button for folders in all 4 view modes

## Features

### Security
- ✅ **User Filtering**: Regular users can only download their own folders
- ✅ **Admin Access**: Admins can download any folder in the organization
- ✅ **Virus Scan Check**: Blocks download if any file is infected
- ✅ **Permission Validation**: Verifies organization access

### Performance
- ✅ **Streaming**: ZIP is created and streamed on-the-fly (no temp files)
- ✅ **Memory Efficient**: Uses Node.js streams for large folders
- ✅ **Compression**: Applies level 6 compression (balanced speed/size)

### User Experience
- ✅ **Progress Feedback**: Toast notifications for download start/completion
- ✅ **Error Handling**: Clear error messages if download fails
- ✅ **Hover Actions**: Download button appears on folder hover
- ✅ **All View Modes**: Available in Large Icons, List, Details, and Tiles

## How It Works

### Flow Diagram
```
User clicks "Download ZIP" button
        ↓
Frontend calls downloadFolderAsZip()
        ↓
Backend receives request
        ↓
Find folder record in MongoDB
        ↓
Query all files recursively
        ↓
Check virus scan status
        ↓
Stream files from S3
        ↓
Create ZIP archive with archiver
        ↓
Stream ZIP to frontend
        ↓
Browser triggers download
```

### Example API Call
```http
GET /files/folder/folder_12345/download?orgId=admincorp&userId=user_123
```

### Example Response Headers
```
Content-Type: application/zip
Content-Disposition: attachment; filename="Documents.zip"
Transfer-Encoding: chunked
```

## Installation Steps

### 1. Install Dependencies

**Backend (Legacy):**
```bash
cd Backend
npm install
```

**Backend (Microservices):**
```bash
cd Backend/microservices/files-service
npm install
```

### 2. Rebuild Docker Containers

**For local development:**
```bash
docker-compose build files-service
docker-compose up -d files-service
```

### 3. Redeploy to GCP (Production)

**For Cloud Run deployment:**
```bash
# Build and push new image
cd Backend/microservices/files-service
gcloud builds submit --tag gcr.io/project-clouddock/files-service
gcloud run deploy files-service --image gcr.io/project-clouddock/files-service --region asia-south1
```

## Testing

### Local Development Testing

1. **Start the application:**
   ```bash
   # Terminal 1: Start backend
   docker-compose up -d
   
   # Terminal 2: Start frontend
   cd Frontend
   npm run dev
   ```

2. **Test regular user:**
   - Login as regular user at `http://localhost:8080`
   - Create a folder with some files
   - Hover over the folder
   - Click the download (📥) button
   - Verify ZIP downloads and contains all files

3. **Test admin user:**
   - Login as admin at `http://localhost:8080/admin/dashboard`
   - Go to "All Organization Files" tab
   - Navigate into a user's folder
   - Hover over a subfolder
   - Click download button
   - Verify ZIP downloads correctly

### Edge Cases to Test

- ✅ **Empty folder**: Should show error "Folder is empty"
- ✅ **Infected files**: Should block download and list infected files
- ✅ **Large folders**: Should stream properly without timeout
- ✅ **Nested folders**: Should maintain folder structure in ZIP
- ✅ **Special characters**: Folder names with spaces, symbols should work

### Expected Behavior

**Success:**
- Toast: "Preparing download... Creating ZIP archive for 'FolderName'"
- Toast: "Download started - FolderName.zip is being downloaded"
- Browser downloads `FolderName.zip`
- ZIP contains all files with correct folder structure

**Failure:**
- Toast: "Download failed - Could not download folder. Please try again."
- Console logs detailed error

## File Structure in ZIP

### Example:
```
Documents/              (root folder)
├── file1.pdf
├── file2.docx
├── SubFolder1/
│   ├── file3.txt
│   └── file4.xlsx
└── SubFolder2/
    └── file5.png
```

### Relative Paths:
- Files in root folder: `file1.pdf`
- Files in subfolder: `SubFolder1/file3.txt`
- Nested subfolders: `SubFolder2/DeepFolder/file.txt`

## Cost Considerations

### S3 Costs
- **GET Requests**: $0.0004 per 1,000 requests
  - Each file download is 1 GET request
  - Folder with 100 files = 100 GET requests = $0.00004
  
- **Data Transfer Out**: $0.09 per GB (to internet)
  - Only charged if files leave AWS (to user's browser)
  - Folder with 500MB files = $0.045

### Cloud Run Costs
- **Request Time**: Charged per 100ms of execution
  - ZIP creation takes ~1-5 seconds for typical folders
  - Negligible cost (<$0.001 per download)

### Cost Optimization
- ✅ **Streaming**: Reduces memory usage and instance size
- ✅ **Compression**: Reduces data transfer costs
- ✅ **Direct S3 Access**: No intermediate storage needed

## Technical Details

### Archiver Configuration
```javascript
const archive = archiver("zip", {
  zlib: { level: 6 }, // Compression level (0-9)
});
```

### Memory Management
- Files are streamed from S3 directly to the ZIP
- No files are stored in memory or disk
- Suitable for folders of any size

### Error Handling
- **Folder not found**: 404 error
- **Empty folder**: 400 error with message
- **Infected files**: 403 error with list of infected files
- **S3 errors**: Logged and skipped (other files continue)
- **Archive errors**: 500 error

## Future Enhancements

### Potential Features:
- [ ] Progress bar for large folder downloads
- [ ] Resume interrupted downloads
- [ ] Download multiple folders at once
- [ ] Exclude specific files/folders
- [ ] Custom compression levels
- [ ] Download history/audit log
- [ ] Background job for very large folders (email link when ready)

## Troubleshooting

### Issue: Download fails immediately
- **Check**: Is archiver installed? Run `npm install` in Backend
- **Check**: Are there files in the folder?
- **Check**: Browser console for errors

### Issue: ZIP is corrupted
- **Check**: Are all files in S3?
- **Check**: Virus scan status of files
- **Check**: Backend logs for S3 errors

### Issue: Download times out
- **Increase**: Cloud Run timeout (default: 5 minutes)
- **Check**: Total folder size (very large folders need longer timeout)
- **Solution**: Implement background job for huge folders

### Issue: Missing files in ZIP
- **Check**: Backend logs - look for "Failed to add file" errors
- **Check**: S3 permissions - ensure files are accessible
- **Check**: File metadata - ensure files aren't marked as deleted

## Summary

The folder ZIP download feature provides a seamless way for users and admins to download entire folder structures. It's:

- **Fast**: Streaming eliminates wait time
- **Secure**: Respects user permissions and virus scanning
- **Efficient**: Memory-friendly for any folder size
- **Universal**: Works across all view layouts

**Files Modified**: 11
**New Files Created**: 2
**Dependencies Added**: 1 (archiver)
**Routes Added**: 1 (`GET /files/folder/:folderId/download`)

---

**Created**: November 17, 2024
**Feature**: Folder ZIP Download
**Status**: ✅ Complete & Ready for Testing

