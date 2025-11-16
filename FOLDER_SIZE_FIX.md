# Folder Size Calculation Fix

## Problem
Folders were displaying "0 B" size even when they contained files. The issue was that folders were created with a hardcoded `size: 0` and this value was never updated when files were added.

## Solution
Implemented dynamic folder size calculation that recursively sums up all files within a folder and its subfolders.

## Changes Made

### 1. Backend Services (Both Monolithic and Microservices)
Updated the following files:
- `Backend/services/files/src/controllers/fileController.js`
- `Backend/microservices/files-service/src/controllers/fileController.js`

#### Added Function: `calculateFolderSize`
```javascript
const calculateFolderSize = async (orgId, folderName, parentFolder) => {
  // Constructs folder path
  // Finds all files recursively within the folder
  // Excludes folders themselves from size calculation
  // Returns total size of all files
}
```

#### Modified Function: `getOrganizationFiles`
- Now dynamically calculates folder sizes when listing files
- Uses `Promise.all` to calculate sizes for all folders in parallel
- Returns correct size for folders instead of hardcoded 0

## How It Works

1. When a folder is listed (e.g., viewing "My Files"), the API fetches all files/folders in the current directory
2. For each item that is a folder (mimeType: "application/vnd.clouddock.folder"), the system:
   - Constructs the folder's path (e.g., "/new/" for a folder named "new")
   - Queries the database for all files where the `folder` field starts with this path
   - Sums up the sizes of all matching files
   - Returns this calculated size instead of the stored `size: 0`

3. The calculation is recursive, meaning:
   - Folder "new" containing file1.txt (100 B) will show 100 B
   - Folder "new" containing subfolder "sub" with file2.txt (200 B) will show 200 B
   - Folder "new" containing both file1.txt (100 B) and "sub/file2.txt" (200 B) will show 300 B

## Testing

### To Test the Fix:

1. **Restart the Backend Service(s)**:
   ```bash
   # If using the monolithic services
   cd Backend
   npm run dev:all
   
   # OR if using Docker microservices
   cd Backend/microservices
   docker-compose restart files-service gateway
   ```

2. **Test Scenario 1: Existing Folders**
   - Navigate to "My Files" in the UI
   - Look at any existing folder (e.g., "new")
   - It should now display the total size of all files inside it

3. **Test Scenario 2: New Files in Folders**
   - Open an existing folder
   - Upload a new file
   - Navigate back to "My Files"
   - The folder size should reflect the new file

4. **Test Scenario 3: Nested Folders**
   - Create a folder (e.g., "parent")
   - Open it and create a subfolder (e.g., "child")
   - Upload files to the subfolder
   - Navigate back to "My Files"
   - The parent folder should show the total size including files in the child folder

## Performance Considerations

- The size calculation is done on-demand when listing files, not stored in the database
- This ensures the size is always accurate even if files are added/deleted
- Uses MongoDB regex queries which are indexed for good performance
- Parallel calculation using `Promise.all` for multiple folders

## Database Schema
No changes to the database schema were needed. The `size` field in folders remains at 0 in the database, but is calculated dynamically when returned to the client.

## Future Improvements (Optional)
If performance becomes an issue with very large folder structures:
1. Add a caching layer (Redis) with TTL
2. Store calculated sizes in the database and update on file changes
3. Add database triggers or scheduled jobs to update folder sizes
4. Implement pagination for large folders

## Files Modified
- ✅ Backend/services/files/src/controllers/fileController.js
- ✅ Backend/microservices/files-service/src/controllers/fileController.js

## Status
✅ **Implementation Complete** - Ready for testing!

