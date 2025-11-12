# AWS S3 Storage Implementation Guide

## 🎯 Overview

Complete implementation of file storage using AWS S3 with virus scanning via AWS Lambda. Each organization gets 1GB of free storage with pay-per-use expansion available later.

---

## ✅ What Was Implemented

### **Backend (Completed)**

1. **AWS S3 Integration**

   - File upload to S3
   - File download from S3
   - Presigned URLs for secure downloads
   - File deletion from S3

2. **Storage Quota Management**

   - 1GB free storage per organization
   - Usage tracking per organization
   - Quota checking before upload
   - Storage usage calculation

3. **File Management**

   - File metadata storage in MongoDB
   - File upload API
   - File download API
   - File deletion API
   - Organization file listing

4. **Virus Scanning**
   - AWS Lambda function with ClamAV
   - Automatic scan after upload
   - Scan status tracking
   - Infected file blocking

### **Frontend (Pending)**

- Upload UI integration
- Storage quota display
- File listing with real data
- Download functionality

---

## 📁 Files Created/Modified

### **Backend Files:**

```
Backend/
├── services/files/src/
│   ├── config/
│   │   └── aws.js                      ✅ AWS S3 & Lambda config
│   ├── models/
│   │   ├── File.js                     ✅ File metadata model
│   │   └── StorageQuota.js             ✅ Storage quota model
│   ├── services/
│   │   ├── s3Service.js                ✅ S3 operations
│   │   ├── storageService.js           ✅ Storage quota logic
│   │   └── virusScanService.js         ✅ Virus scanning logic
│   ├── controllers/
│   │   └── fileController.js           ✅ File API controllers
│   ├── routes/
│   │   └── fileRoutes.js               ✅ File API routes
│   └── index.js                        ✅ Updated with routes
├── lambda/virus-scanner/
│   ├── index.mjs                       ✅ Lambda function
│   └── README.md                       ✅ Deployment guide
├── package.json                        ✅ Added AWS SDK dependencies
└── .env.example                        ✅ Updated with AWS config
```

---

## 🔧 Setup Instructions

### **1. Install Dependencies**

```bash
cd Backend
npm install
```

**New Dependencies:**

- `@aws-sdk/client-s3` - S3 operations
- `@aws-sdk/client-lambda` - Lambda invocation
- `@aws-sdk/s3-request-presigner` - Presigned URLs
- `multer` - File upload handling
- `uuid` - Unique file IDs

### **2. AWS Configuration**

#### **Create S3 Bucket:**

```bash
aws s3api create-bucket \
  --bucket clouddock-storage \
  --region us-east-1

# Enable versioning (optional)
aws s3api put-bucket-versioning \
  --bucket clouddock-storage \
  --versioning-configuration Status=Enabled

# Set CORS policy
aws s3api put-bucket-cors \
  --bucket clouddock-storage \
  --cors-configuration file://cors-config.json
```

**cors-config.json:**

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["http://localhost:8080", "https://your-domain.com"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

#### **Create IAM User:**

```bash
# Create IAM user
aws iam create-user --user-name clouddock-s3-user

# Attach S3 policy
aws iam attach-user-policy \
  --user-name clouddock-s3-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create access key
aws iam create-access-key --user-name clouddock-s3-user
```

Save the access key ID and secret access key.

### **3. Environment Variables**

Update `Backend/.env`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# S3 Storage
S3_BUCKET_NAME=clouddock-storage

# Virus Scanning
ENABLE_VIRUS_SCAN=true
VIRUS_SCAN_LAMBDA=clouddock-virus-scanner

# File Upload
MAX_FILE_SIZE_MB=100
```

### **4. Deploy Lambda Function**

See `Backend/lambda/virus-scanner/README.md` for detailed deployment instructions.

**Quick Deploy:**

```bash
cd Backend/lambda/virus-scanner
zip function.zip index.mjs

aws lambda create-function \
  --function-name clouddock-virus-scanner \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 300 \
  --memory-size 1024 \
  --environment Variables="{CALLBACK_URL=http://your-api.com/files/virus-scan-callback}"
```

### **5. Start Backend**

```bash
cd Backend
npm run dev:all
```

---

## 📚 API Documentation

### **1. Upload File**

```http
POST /files/upload
Content-Type: multipart/form-data

Body (form-data):
- file: [binary file]
- orgId: string
- userId: string
- userName: string
- userEmail: string
- folder: string (optional, default: "/")
```

**Response:**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "fileId": "uuid-here",
    "fileName": "generated-name.pdf",
    "originalName": "document.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "uploadedAt": "2025-11-12T10:30:00Z",
    "virusScanStatus": "pending"
  },
  "storageInfo": {
    "orgId": "acme-corp",
    "totalQuota": 1073741824,
    "usedStorage": 10240000,
    "availableStorage": 1063501824,
    "fileCount": 10,
    "usagePercentage": 0.95,
    "isPaidPlan": false,
    "isQuotaExceeded": false
  }
}
```

### **2. Get Download URL**

```http
GET /files/:fileId/download?orgId=acme-corp
```

**Response:**

```json
{
  "success": true,
  "downloadUrl": "https://s3.amazonaws.com/bucket/path?signature=...",
  "file": {
    "fileId": "uuid-here",
    "fileName": "file.pdf",
    "originalName": "document.pdf",
    "size": 1024000,
    "mimeType": "application/pdf"
  },
  "expiresIn": 3600
}
```

### **3. List Organization Files**

```http
GET /files/org/:orgId?folder=/&page=1&limit=50
```

**Response:**

```json
{
  "success": true,
  "files": [
    {
      "fileId": "uuid-1",
      "fileName": "file1.pdf",
      "originalName": "document.pdf",
      "size": 1024000,
      "mimeType": "application/pdf",
      "folder": "/",
      "uploadedBy": {
        "userId": "user-1",
        "userName": "John Doe",
        "userEmail": "john@example.com"
      },
      "uploadedAt": "2025-11-12T10:30:00Z",
      "virusScanStatus": "clean"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalFiles": 250,
    "limit": 50
  }
}
```

### **4. Delete File**

```http
DELETE /files/:fileId?orgId=acme-corp&userId=user-1
```

**Response:**

```json
{
  "success": true,
  "message": "File deleted successfully",
  "fileId": "uuid-here"
}
```

### **5. Get Storage Info**

```http
GET /files/storage/:orgId
```

**Response:**

```json
{
  "success": true,
  "storage": {
    "orgId": "acme-corp",
    "totalQuota": 1073741824,
    "usedStorage": 536870912,
    "availableStorage": 536870912,
    "fileCount": 150,
    "usagePercentage": 50.0,
    "isPaidPlan": false,
    "isQuotaExceeded": false
  }
}
```

### **6. Virus Scan Callback (Internal)**

```http
POST /files/virus-scan-callback

Body:
{
  "fileId": "uuid-here",
  "status": "clean" | "infected" | "error",
  "threats": ["threat-name"],
  "engine": "ClamAV"
}
```

---

## 🔄 File Upload Flow

```
1. User selects file
   ↓
2. Frontend validates file size
   ↓
3. POST /files/upload
   ↓
4. Backend checks storage quota
   ↓
5. If quota OK, upload to S3
   ↓
6. Save file metadata to MongoDB
   ↓
7. Update storage usage
   ↓
8. Trigger Lambda virus scan (async)
   ↓
9. Return success to frontend
   ↓
10. Lambda scans file
    ↓
11. Lambda calls callback endpoint
    ↓
12. Update scan status in DB
    ↓
13. If infected, mark file as quarantined
```

---

## 🛡️ Virus Scanning Flow

```
1. File uploaded to S3
   ↓
2. Lambda triggered with file info
   ↓
3. Lambda downloads file from S3
   ↓
4. ClamAV scans file
   ↓
5. Scan result determined
   ↓
6. Lambda calls webhook
   ↓
7. Backend updates file status
   ↓
8. If infected:
   - Mark file as quarantined
   - Block downloads
   - Notify admin (future)
   ↓
9. If clean:
   - Allow downloads
   - Show status as "clean"
```

---

## 💾 Database Schema

### **File Model:**

```javascript
{
  fileId: String (unique, indexed),
  fileName: String,
  originalName: String,
  mimeType: String,
  size: Number,
  s3Key: String (unique),
  s3Bucket: String,
  orgId: String (indexed),
  uploadedBy: {
    userId: String,
    userName: String,
    userEmail: String
  },
  folder: String (default: "/"),
  virusScanStatus: enum ["pending", "scanning", "clean", "infected", "error"],
  virusScanResult: {
    scannedAt: Date,
    engine: String,
    threats: [String]
  },
  isDeleted: Boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **StorageQuota Model:**

```javascript
{
  orgId: String (unique, indexed),
  totalQuota: Number (default: 1GB),
  usedStorage: Number,
  fileCount: Number,
  isPaidPlan: Boolean,
  paidStorageGB: Number,
  billingCycle: enum ["monthly", "yearly", "none"],
  lastCalculated: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing

### **Test File Upload:**

```bash
curl -X POST http://localhost:4000/files/upload \
  -F "file=@test.pdf" \
  -F "orgId=test-org" \
  -F "userId=user-1" \
  -F "userName=John Doe" \
  -F "userEmail=john@test.com"
```

### **Test Storage Info:**

```bash
curl http://localhost:4000/files/storage/test-org
```

### **Test File List:**

```bash
curl http://localhost:4000/files/org/test-org
```

---

## 📊 Storage Limits

| Plan | Storage          | Cost        |
| ---- | ---------------- | ----------- |
| Free | 1 GB             | $0          |
| Paid | 1 GB + purchased | Pay-per-use |

**Free Storage Features:**

- 1 GB per organization
- Automatic quota tracking
- Virus scanning included
- Unlimited file uploads (within quota)

**Future Paid Features:**

- Additional storage purchase
- Monthly/Yearly billing
- Usage reports
- Premium support

---

## 🚀 Next Steps

1. **Frontend Integration**

   - Connect upload button
   - Display storage quota
   - Show file list with real data
   - Implement download

2. **Enhancements**

   - Folder management
   - File sharing
   - File versioning
   - Bulk operations

3. **Billing Integration**
   - Pay-per-use mechanism
   - Payment gateway
   - Invoice generation

---

**Status:** ✅ Backend Complete | ⏳ Frontend Pending

**Last Updated:** November 12, 2025
