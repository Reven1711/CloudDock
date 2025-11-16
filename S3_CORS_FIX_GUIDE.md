# 🔧 Fix S3 CORS Issue for Direct Upload

## 🚨 The Problem

You're getting this error:
```
Access to XMLHttpRequest at 'https://skyvault-bucket-1.s3.ap-south-1.amazonaws.com/...' 
from origin 'https://clouddock-frontend.vercel.app' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**What's happening:**
- Your frontend (Vercel) tries to upload directly to S3
- S3 bucket doesn't have CORS configured
- Browser blocks the request for security

**This is different from the Gateway CORS issue** - this is about the S3 bucket itself!

---

## ✅ The Solution

Configure CORS on your S3 bucket to allow direct uploads from your frontend.

---

## 🚀 Quick Fix (Recommended)

### Option 1: Using AWS CLI (Fastest - 30 seconds)

1. **Open Command Prompt in the `Backend/microservices` directory**

2. **Run the configuration script:**
   ```cmd
   configure-s3-cors.bat
   ```

3. **Done!** The script will:
   - Apply CORS configuration to `skyvault-bucket-1`
   - Verify it was applied correctly
   - Show you the configuration

### Option 2: Manual AWS CLI Command

If the script doesn't work, run manually:

```bash
cd Backend/microservices
aws s3api put-bucket-cors --bucket skyvault-bucket-1 --cors-configuration file://configure-s3-cors.json
```

Verify it worked:
```bash
aws s3api get-bucket-cors --bucket skyvault-bucket-1
```

---

## 🖥️ Alternative: AWS Console (Visual Method)

If you prefer using the AWS Console:

### Step 1: Open S3 Console
1. Go to https://s3.console.aws.amazon.com/
2. Sign in with your AWS account

### Step 2: Find Your Bucket
1. Find and click on **`skyvault-bucket-1`**
2. Go to **Permissions** tab
3. Scroll down to **Cross-origin resource sharing (CORS)**

### Step 3: Edit CORS Configuration
1. Click **Edit**
2. **Delete any existing configuration**
3. **Paste this configuration:**

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "https://clouddock-frontend.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

4. Click **Save changes**

### Step 4: Verify
- You should see "CORS configuration successfully updated"
- Green checkmark ✅

---

## 📋 What This CORS Configuration Does

```json
{
  "AllowedOrigins": [
    "https://clouddock-frontend.vercel.app",  // Your production frontend
    "http://localhost:5173",                   // Vite dev server
    "http://localhost:3000"                    // Alternative dev server
  ]
}
```
✅ Allows requests from your Vercel frontend  
✅ Allows requests from local development  

```json
{
  "AllowedMethods": [
    "GET",     // Download files
    "PUT",     // Upload files (presigned URLs)
    "POST",    // Alternative upload
    "DELETE",  // Delete files
    "HEAD"     // Check file existence
  ]
}
```
✅ Allows all necessary operations

```json
{
  "AllowedHeaders": ["*"]
}
```
✅ Allows all request headers (Content-Type, etc.)

```json
{
  "ExposeHeaders": [
    "ETag",                          // File integrity check
    "Content-Length",                // File size
    "x-amz-server-side-encryption",  // Encryption info
    "x-amz-request-id",              // Request tracking
    "x-amz-id-2"                     // Request tracking
  ]
}
```
✅ Exposes necessary AWS headers to frontend

```json
{
  "MaxAgeSeconds": 3600
}
```
✅ Caches preflight requests for 1 hour (faster subsequent uploads)

---

## 🧪 Testing After Configuration

### Test 1: Verify CORS is Applied

**Using AWS CLI:**
```bash
aws s3api get-bucket-cors --bucket skyvault-bucket-1
```

**Expected output:**
```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedOrigins": [
                "https://clouddock-frontend.vercel.app",
                "http://localhost:5173",
                "http://localhost:3000"
            ],
            "ExposeHeaders": [...],
            "MaxAgeSeconds": 3600
        }
    ]
}
```

### Test 2: Upload a File

1. Go to https://clouddock-frontend.vercel.app
2. Click **Upload** button
3. Select a file **> 30MB** (like your 100MB.bin)
4. Click **Upload**
5. ✅ Should work without CORS error!
6. ✅ Should see: "Uploading directly to S3..."
7. ✅ Should see real-time progress: 0% → 100%

### Test 3: Check Browser Console

Open DevTools (F12) → Console tab:

**Should see:**
```
🚀 Starting direct S3 upload for 100MB.bin (100.00 MB)
📝 Step 1/3: Requesting presigned URL...
✅ Got presigned URL (fileId: ...)
📤 Step 2/3: Uploading to S3...
✅ Upload to S3 complete
✔️ Step 3/3: Confirming upload...
✅ Upload confirmed: File upload confirmed and processed successfully
```

**Should NOT see:**
```
❌ Access to XMLHttpRequest ... has been blocked by CORS policy
❌ Direct upload failed
```

---

## 🔍 Troubleshooting

### Issue: "aws: command not found"

**Solution:**
1. Install AWS CLI: https://aws.amazon.com/cli/
2. Or use AWS Console method instead

### Issue: "An error occurred (NoSuchBucket)"

**Solution:**
- Bucket name is wrong
- Check your `.env` file: `S3_BUCKET_NAME=skyvault-bucket-1`
- Update the script if bucket name is different

### Issue: "An error occurred (AccessDenied)"

**Solution:**
1. Check AWS credentials: `aws configure`
2. Ensure IAM user has permission: `s3:PutBucketCORS`
3. Try using AWS Console instead

### Issue: "Still getting CORS error after configuration"

**Possible reasons:**

1. **Wrong bucket** - Check the error message for bucket name
2. **Cache** - Clear browser cache and hard reload (Ctrl+Shift+R)
3. **Wrong origin** - Check if your Vercel URL is correct
4. **Configuration not saved** - Verify with `aws s3api get-bucket-cors`

**Debug steps:**
```bash
# 1. Verify CORS configuration
aws s3api get-bucket-cors --bucket skyvault-bucket-1

# 2. Check bucket location
aws s3api get-bucket-location --bucket skyvault-bucket-1

# 3. List buckets (verify bucket exists)
aws s3 ls
```

### Issue: "Multiple origins needed"

If you deploy to multiple domains:

```json
{
  "AllowedOrigins": [
    "https://clouddock-frontend.vercel.app",
    "https://your-custom-domain.com",
    "https://staging-clouddock.vercel.app",
    "http://localhost:5173"
  ]
}
```

---

## 🎯 Why This Happens

### The Upload Flow

**Standard Upload (< 30MB):**
```
Browser → Cloud Run Gateway → Files Service → S3
        ✅ Gateway has CORS configured
```

**Direct Upload (≥ 30MB):**
```
Browser → Files Service: "Get URL please"
Files Service → Browser: "Here's presigned URL"
Browser → S3 directly: "Here's the file"
        ❌ S3 needs CORS too!
```

### Why S3 Needs CORS

1. **Browser security model** requires CORS for cross-origin requests
2. **S3 is a different origin** than your frontend (different domain)
3. **Presigned URLs don't bypass CORS** - they only handle authentication
4. **CORS is checked before authentication** - so presigned URL doesn't help with CORS

---

## 📚 Additional Resources

- [AWS S3 CORS Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [AWS CLI S3 API Reference](https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-cors.html)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## ✅ Success Checklist

After applying the fix:

- [ ] CORS configuration applied to S3 bucket
- [ ] Verified with AWS CLI or Console
- [ ] Cleared browser cache
- [ ] Tested upload with 50MB+ file
- [ ] No CORS errors in browser console
- [ ] File uploads successfully
- [ ] File appears in files list

---

## 🎉 Expected Result

**Before:**
```
❌ Access to XMLHttpRequest ... blocked by CORS policy
❌ Upload failed
❌ Network Error
```

**After:**
```
✅ 🚀 Starting direct S3 upload...
✅ 📝 Requesting presigned URL...
✅ 📤 Uploading to S3...
✅ Upload progress: 0% → 100%
✅ ✔️ Upload confirmed!
✅ File uploaded successfully!
```

---

**Status:** Configuration files created ✅

**Files created:**
- `Backend/microservices/configure-s3-cors.json` - CORS configuration
- `Backend/microservices/configure-s3-cors.bat` - Auto-configuration script
- `S3_CORS_FIX_GUIDE.md` - This guide

**Next step:** Run `configure-s3-cors.bat` or apply CORS via AWS Console

