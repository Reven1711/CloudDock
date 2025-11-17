# Virus Scanning Implementation Guide for CloudDock

## 📋 Overview

This guide covers multiple approaches to implement virus scanning for file uploads in CloudDock, including integration with the current direct S3 upload architecture.

---

## 🎯 Virus Scanning Strategies

### Strategy Comparison

| Strategy | Pros | Cons | Cost | Best For |
|----------|------|------|------|----------|
| **ClamAV (Self-hosted)** | Free, Open-source, Full control | Resource intensive, Maintenance | $0 + compute | Small to medium scale |
| **AWS Lambda + ClamAV** | Serverless, Scalable | Cold starts, Size limits | Low | Medium scale |
| **Cloudmersive API** | Easy integration, Fast | Per-file cost | $0.002/file | Any scale |
| **MetaDefender** | Multiple engines, Detailed reports | More expensive | $0.005/file | Enterprise |
| **S3 + Lambda (Async)** | Non-blocking, Scalable | Complex setup | Low | High volume |

---

## 🏗️ Architecture Options

### Option 1: Synchronous Scanning (Before S3 Upload)

```
┌─────────┐  1. Upload     ┌─────────────┐  2. Scan    ┌─────────┐
│ Browser │ ────────────> │ Files Service│ ──────────> │ ClamAV  │
│         │                │              │             │ Engine  │
│         │                │              │ <────────── └─────────┘
│         │                │              │  3. Result
│         │                │              │  
│         │                │              │  4. Upload (if clean)
│         │                │              │ ──────────────────────┐
│         │                │              │                       ↓
│         │ <────────────  │              │                  ┌─────────┐
│         │  5. Success    └─────────────┘                  │  AWS S3 │
└─────────┘                                                 └─────────┘
```

**Pros:**
- ✅ Files only uploaded if clean
- ✅ Simpler to implement
- ✅ No quarantine bucket needed

**Cons:**
- ❌ Slower upload experience
- ❌ Times out for large files
- ❌ Higher backend resource usage

---

### Option 2: Asynchronous Scanning (After S3 Upload)

```
┌─────────┐  1. Upload     ┌─────────────┐  2. Save to     ┌──────────────┐
│ Browser │ ────────────> │ Files Service│ ──────────────> │ S3 Quarantine│
│         │                │              │                  │    Bucket    │
└─────────┘                └─────────────┘                  └──────────────┘
                                                                    │
                                                                    │ 3. Trigger
                                                                    ↓
                                                            ┌──────────────┐
                                                            │ Lambda / Cloud│
                                                            │   Function   │
                                                            └──────────────┘
                                                                    │
                                                            4. Scan with ClamAV
                                                                    │
                                    ┌───────────────────────────────┴────────────┐
                                    ↓                                            ↓
                            ┌──────────────┐                            ┌──────────────┐
                            │  If CLEAN    │                            │  If INFECTED │
                            │ Move to Main │                            │   Delete &   │
                            │    Bucket    │                            │    Notify    │
                            └──────────────┘                            └──────────────┘
```

**Pros:**
- ✅ Fast upload experience
- ✅ Non-blocking
- ✅ Scalable (serverless)
- ✅ Works with direct S3 uploads

**Cons:**
- ❌ More complex setup
- ❌ Files briefly in quarantine
- ❌ Requires Lambda/Cloud Functions

---

### Option 3: Hybrid Approach (Recommended for CloudDock)

```
Small Files (<10 MB):
  Browser → Backend → Scan → S3 (if clean)

Large Files (>10 MB):
  Browser → S3 Quarantine → Lambda Scan → S3 Main (if clean)
```

**Best of both worlds:**
- Fast small file uploads with immediate feedback
- Scalable large file handling
- No timeout issues

---

## 💻 Implementation

### Approach 1: ClamAV Integration (Synchronous)

#### Step 1: Install ClamAV in Docker

**Dockerfile (files-service):**
```dockerfile
FROM node:18-alpine

# Install ClamAV
RUN apk add --no-cache clamav clamav-libunrar

# Create ClamAV directories
RUN mkdir -p /var/lib/clamav /var/log/clamav
RUN chown -R clamav:clamav /var/lib/clamav /var/log/clamav

# Copy ClamAV configuration
COPY clamd.conf /etc/clamav/clamd.conf
COPY freshclam.conf /etc/clamav/freshclam.conf

# Update virus definitions
RUN freshclam --config-file=/etc/clamav/freshclam.conf

# Start ClamAV daemon
RUN clamd --config-file=/etc/clamav/clamd.conf &

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4004

CMD ["node", "src/index.js"]
```

**clamd.conf:**
```conf
LogFile /var/log/clamav/clamd.log
LogTime yes
DatabaseDirectory /var/lib/clamav
LocalSocket /var/run/clamav/clamd.sock
TCPSocket 3310
TCPAddr 127.0.0.1
MaxFileSize 1000M
MaxScanSize 1000M
StreamMaxLength 1000M
```

**freshclam.conf:**
```conf
DatabaseDirectory /var/lib/clamav
UpdateLogFile /var/log/clamav/freshclam.log
DatabaseMirror database.clamav.net
```

#### Step 2: Install Node.js ClamAV Client

```bash
npm install clamscan
```

#### Step 3: Create Virus Scanning Service

**Backend/microservices/files-service/src/services/virusScanService.js:**
```javascript
import NodeClam from 'clamscan';

class VirusScanService {
  constructor() {
    this.clamav = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.clamav = await new NodeClam().init({
        removeInfected: false,
        quarantineInfected: false,
        scanLog: '/var/log/clamav/scan.log',
        debugMode: process.env.NODE_ENV !== 'production',
        clamdscan: {
          host: 'localhost',
          port: 3310,
          timeout: 60000,
          localFallback: true,
        },
        preference: 'clamdscan'
      });
      
      this.initialized = true;
      console.log('✅ ClamAV initialized successfully');
      
      // Get version info
      const version = await this.clamav.getVersion();
      console.log(`🦠 ClamAV version: ${version}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize ClamAV:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Scan a file buffer for viruses
   * @param {Buffer} fileBuffer - File buffer to scan
   * @param {string} fileName - Name of the file (for logging)
   * @returns {Promise<Object>} Scan result
   */
  async scanBuffer(fileBuffer, fileName) {
    if (!this.initialized) {
      console.warn('⚠️ ClamAV not initialized, skipping scan');
      return {
        isInfected: false,
        viruses: [],
        skipped: true,
        message: 'Virus scanning disabled'
      };
    }

    try {
      console.log(`🔍 Scanning file: ${fileName} (${fileBuffer.length} bytes)`);
      
      const { isInfected, viruses } = await this.clamav.scanStream(fileBuffer);
      
      if (isInfected) {
        console.error(`🚨 VIRUS DETECTED in ${fileName}: ${viruses.join(', ')}`);
        return {
          isInfected: true,
          viruses,
          fileName,
          message: `Virus detected: ${viruses.join(', ')}`
        };
      }
      
      console.log(`✅ File clean: ${fileName}`);
      return {
        isInfected: false,
        viruses: [],
        fileName,
        message: 'File is clean'
      };
    } catch (error) {
      console.error(`❌ Scan error for ${fileName}:`, error);
      
      // In production, you might want to reject files that fail to scan
      // For now, we'll allow them but log the error
      return {
        isInfected: false,
        viruses: [],
        error: error.message,
        message: 'Scan failed - file allowed',
        scanError: true
      };
    }
  }

  /**
   * Scan a file from S3
   * @param {string} s3Key - S3 object key
   * @param {string} bucket - S3 bucket name
   * @returns {Promise<Object>} Scan result
   */
  async scanS3File(s3Key, bucket) {
    if (!this.initialized) {
      return {
        isInfected: false,
        skipped: true,
        message: 'Virus scanning disabled'
      };
    }

    try {
      // Download file from S3
      const { Body } = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: s3Key
      }));
      
      // Convert stream to buffer
      const fileBuffer = await this.streamToBuffer(Body);
      
      // Scan the buffer
      return await this.scanBuffer(fileBuffer, s3Key);
    } catch (error) {
      console.error(`❌ Error scanning S3 file ${s3Key}:`, error);
      return {
        isInfected: false,
        error: error.message,
        scanError: true
      };
    }
  }

  /**
   * Update virus definitions
   * @returns {Promise<boolean>}
   */
  async updateDefinitions() {
    if (!this.initialized) {
      console.warn('⚠️ ClamAV not initialized');
      return false;
    }

    try {
      console.log('🔄 Updating ClamAV virus definitions...');
      // Run freshclam to update definitions
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      await execAsync('freshclam');
      console.log('✅ Virus definitions updated');
      return true;
    } catch (error) {
      console.error('❌ Failed to update definitions:', error);
      return false;
    }
  }

  /**
   * Convert stream to buffer
   */
  async streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Get ClamAV statistics
   */
  async getStats() {
    if (!this.initialized) {
      return { initialized: false };
    }

    try {
      const version = await this.clamav.getVersion();
      return {
        initialized: true,
        version,
        enabled: process.env.ENABLE_VIRUS_SCAN !== 'false'
      };
    } catch (error) {
      return {
        initialized: true,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const virusScanService = new VirusScanService();

export default virusScanService;
```

#### Step 4: Update File Controller to Use Virus Scanning

**Backend/microservices/files-service/src/controllers/fileController.js:**
```javascript
import virusScanService from '../services/virusScanService.js';

export const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const { orgId, userId, userName, userEmail, folder = "/" } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 🦠 VIRUS SCAN
    console.log(`🔍 Scanning ${file.originalname} for viruses...`);
    const scanResult = await virusScanService.scanBuffer(
      file.buffer,
      file.originalname
    );

    if (scanResult.isInfected) {
      console.error(`🚨 VIRUS DETECTED: ${file.originalname}`);
      return res.status(400).json({
        error: "File infected with virus",
        message: scanResult.message,
        viruses: scanResult.viruses,
        fileName: file.originalname
      });
    }

    if (scanResult.scanError) {
      console.warn(`⚠️ Scan error for ${file.originalname}, proceeding with caution`);
    }

    // Check storage quota
    const canUpload = await canUploadFile(orgId, file.size);
    if (!canUpload) {
      return res.status(403).json({
        error: "Storage quota exceeded",
        message: "Please upgrade your plan or delete some files"
      });
    }

    // Generate file metadata
    const fileId = uuidv4();
    const s3Key = `${orgId}/${userId}/${Date.now()}-${fileId}-${file.originalname}`;

    // Upload to S3
    const uploadResult = await uploadToS3(file.buffer, s3Key, file.mimetype);

    // Save to database
    const fileRecord = new FileModel({
      fileId,
      fileName: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      s3Key,
      s3Bucket: process.env.S3_BUCKET_NAME,
      orgId,
      folder,
      uploadedBy: {
        userId,
        userName,
        userEmail
      },
      virusScanStatus: scanResult.skipped ? "skipped" : "clean",
      virusScanResult: scanResult,
      virusScanDate: new Date(),
    });

    await fileRecord.save();

    // Update storage usage
    await incrementStorageUsage(orgId, file.size);

    const storageInfo = await getStorageQuota(orgId);

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      file: {
        fileId: fileRecord.fileId,
        fileName: fileRecord.fileName,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
        virusScanStatus: fileRecord.virusScanStatus,
        uploadDate: fileRecord.createdAt,
      },
      storageInfo,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload file", message: error.message });
  }
};
```

#### Step 5: Update File Model

**Backend/microservices/files-service/src/models/File.js:**
```javascript
const FileSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  s3Key: { type: String, required: true },
  s3Bucket: { type: String, required: true },
  orgId: { type: String, required: true, index: true },
  folder: { type: String, default: "/", index: true },
  uploadedBy: {
    userId: { type: String, required: true },
    userName: { type: String },
    userEmail: { type: String }
  },
  
  // 🦠 Virus Scanning Fields
  virusScanStatus: {
    type: String,
    enum: ['pending', 'scanning', 'clean', 'infected', 'error', 'skipped'],
    default: 'pending'
  },
  virusScanResult: {
    isInfected: { type: Boolean, default: false },
    viruses: [{ type: String }],
    message: { type: String },
    error: { type: String },
    scanError: { type: Boolean, default: false }
  },
  virusScanDate: { type: Date },
  
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("File", FileSchema);
```

#### Step 6: Initialize ClamAV on Service Start

**Backend/microservices/files-service/src/index.js:**
```javascript
import express from 'express';
import mongoose from 'mongoose';
import virusScanService from './services/virusScanService.js';
import fileRoutes from './routes/fileRoutes.js';

const app = express();
const PORT = process.env.PORT || 4004;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/files', fileRoutes);

// Health check with virus scanner status
app.get('/health', async (req, res) => {
  const virusScanStats = await virusScanService.getStats();
  
  res.json({
    status: 'healthy',
    service: 'files-service',
    timestamp: new Date().toISOString(),
    virusScanning: virusScanStats
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Initialize ClamAV
    const scannerInitialized = await virusScanService.initialize();
    if (scannerInitialized) {
      console.log('✅ Virus scanner initialized');
      
      // Schedule daily updates
      const cron = require('node-cron');
      cron.schedule('0 2 * * *', async () => {
        console.log('🔄 Running scheduled virus definition update...');
        await virusScanService.updateDefinitions();
      });
    } else {
      console.warn('⚠️ Virus scanner initialization failed - uploads will proceed without scanning');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Files service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

---

### Approach 2: AWS Lambda + ClamAV (Asynchronous)

#### Architecture

1. Upload file to quarantine bucket
2. S3 triggers Lambda function
3. Lambda scans with ClamAV
4. If clean: move to main bucket
5. If infected: delete and notify user

#### Lambda Function Code

**lambda/virusScanner.js:**
```javascript
const AWS = require('aws-sdk');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const s3 = new AWS.S3();
const sns = new AWS.SNS();

const CLEAN_BUCKET = process.env.CLEAN_BUCKET;
const QUARANTINE_BUCKET = process.env.QUARANTINE_BUCKET;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

exports.handler = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  
  console.log(`Scanning file: ${key} from bucket: ${bucket}`);
  
  try {
    // Download file from quarantine bucket
    const { Body } = await s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise();
    
    // Save to /tmp
    const filePath = path.join('/tmp', path.basename(key));
    fs.writeFileSync(filePath, Body);
    
    // Run ClamAV scan
    const clamavPath = '/opt/bin/clamscan';
    const dbPath = '/opt/lib';
    
    const result = spawnSync(clamavPath, [
      '--database', dbPath,
      '--no-summary',
      filePath
    ]);
    
    const output = result.stdout.toString();
    const isInfected = output.includes('FOUND');
    
    if (isInfected) {
      console.log(`🚨 VIRUS DETECTED: ${key}`);
      console.log(`Scan output: ${output}`);
      
      // Delete infected file
      await s3.deleteObject({
        Bucket: bucket,
        Key: key
      }).promise();
      
      // Send notification
      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Subject: 'Virus Detected in Uploaded File',
        Message: `File: ${key}\nVirus: ${output}\nAction: Deleted`
      }).promise();
      
      // Update database (call your API)
      await updateFileStatus(key, 'infected', output);
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Virus detected and file deleted',
          file: key,
          infected: true
        })
      };
    } else {
      console.log(`✅ File clean: ${key}`);
      
      // Move to clean bucket
      await s3.copyObject({
        Bucket: CLEAN_BUCKET,
        CopySource: `${bucket}/${key}`,
        Key: key
      }).promise();
      
      // Delete from quarantine
      await s3.deleteObject({
        Bucket: bucket,
        Key: key
      }).promise();
      
      // Update database
      await updateFileStatus(key, 'clean', 'File is clean');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'File scanned and moved to clean bucket',
          file: key,
          infected: false
        })
      };
    }
  } catch (error) {
    console.error('Scan error:', error);
    
    await updateFileStatus(key, 'error', error.message);
    
    throw error;
  } finally {
    // Cleanup
    const filePath = path.join('/tmp', path.basename(key));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

async function updateFileStatus(s3Key, status, message) {
  // Call your backend API to update file status
  const axios = require('axios');
  
  await axios.post(`${process.env.API_URL}/files/update-scan-status`, {
    s3Key,
    status,
    message
  });
}
```

#### Lambda Layer for ClamAV

**Download and create layer:**
```bash
# Download ClamAV Layer
wget https://github.com/dxinteractive/clamav-lambda-layer/releases/download/v2.0.0/clamav-lambda-layer.zip

# Upload to AWS Lambda Layers
aws lambda publish-layer-version \
  --layer-name clamav-lambda-layer \
  --zip-file fileb://clamav-lambda-layer.zip \
  --compatible-runtimes nodejs18.x nodejs20.x
```

#### S3 Bucket Configuration

**Create two buckets:**
1. `clouddock-quarantine` - For incoming files
2. `skyvault-bucket-1` - For clean files (existing)

**S3 Event Trigger:**
```javascript
// Configure S3 to trigger Lambda on new uploads
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:ap-south-1:xxx:function:virusScanner",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": []
        }
      }
    }
  ]
}
```

---

### Approach 3: Third-Party API (Cloudmersive)

#### Step 1: Sign up for Cloudmersive

Visit: https://cloudmersive.com/virus-api
Get API Key (Free tier: 800 calls/month)

#### Step 2: Install SDK

```bash
npm install cloudmersive-virus-api-client
```

#### Step 3: Create Service

**Backend/microservices/files-service/src/services/cloudmersiveScanner.js:**
```javascript
import CloudmersiveVirusApiClient from 'cloudmersive-virus-api-client';

class CloudmersiveScanner {
  constructor() {
    const defaultClient = CloudmersiveVirusApiClient.ApiClient.instance;
    const Apikey = defaultClient.authentications['Apikey'];
    Apikey.apiKey = process.env.CLOUDMERSIVE_API_KEY;
    
    this.api = new CloudmersiveVirusApiClient.ScanApi();
  }

  async scanBuffer(fileBuffer, fileName) {
    return new Promise((resolve, reject) => {
      this.api.scanFile(fileBuffer, (error, data, response) => {
        if (error) {
          console.error('Cloudmersive scan error:', error);
          reject(error);
        } else {
          const result = {
            isInfected: !data.CleanResult,
            viruses: data.FoundViruses || [],
            fileName,
            message: data.CleanResult ? 'File is clean' : `Virus detected: ${data.FoundViruses.join(', ')}`
          };
          resolve(result);
        }
      });
    });
  }
}

export default new CloudmersiveScanner();
```

#### Step 4: Use in Controller

```javascript
import cloudmersiveScanner from '../services/cloudmersiveScanner.js';

export const uploadFile = async (req, res) => {
  const file = req.file;
  
  // Scan with Cloudmersive
  const scanResult = await cloudmersiveScanner.scanBuffer(
    file.buffer,
    file.originalname
  );
  
  if (scanResult.isInfected) {
    return res.status(400).json({
      error: "File infected with virus",
      viruses: scanResult.viruses
    });
  }
  
  // Continue with upload...
};
```

---

## 🔄 Handling Direct S3 Uploads (Presigned URLs)

### Challenge
With direct S3 uploads, files go directly to S3 without passing through the backend, so we can't scan them synchronously.

### Solution: Asynchronous Scanning

#### Step 1: Update Presigned Upload to Use Quarantine Bucket

```javascript
// Backend/microservices/files-service/src/controllers/presignedUploadController.js

export const generatePresignedUploadUrl = async (req, res) => {
  const { fileName, mimeType, fileSize, orgId, userId } = req.body;
  
  // Use quarantine bucket for direct uploads
  const QUARANTINE_BUCKET = process.env.S3_QUARANTINE_BUCKET || 'clouddock-quarantine';
  
  const s3Key = `${orgId}/${userId}/${Date.now()}-${uuidv4()}.${fileExtension}`;
  
  const command = new PutObjectCommand({
    Bucket: QUARANTINE_BUCKET, // Quarantine bucket
    Key: s3Key,
    ContentType: mimeType,
    ContentLength: fileSize,
    Metadata: {
      'fileid': fileId,
      'orgid': orgId,
      'userid': userId,
      'scan-status': 'pending'
    }
  });
  
  const presignedUrl = await getSignedUrl(s3Client, command, { 
    expiresIn: 3600 
  });
  
  // Create file record with pending scan status
  const fileRecord = new FileModel({
    fileId,
    fileName,
    mimeType,
    size: fileSize,
    s3Key,
    s3Bucket: QUARANTINE_BUCKET,
    orgId,
    folder,
    uploadedBy: { userId, userName, userEmail },
    virusScanStatus: "pending", // Will be updated by Lambda
  });
  await fileRecord.save();
  
  res.json({ presignedUrl, fileId });
};
```

#### Step 2: Lambda Scans and Moves to Main Bucket

The Lambda function (from Approach 2) will:
1. Scan the file in quarantine
2. If clean: Move to main bucket
3. Update file record in database

#### Step 3: Frontend Polls for Scan Status

```typescript
// Frontend/src/services/directUploadService.ts

export const waitForVirusScan = async (fileId: string, orgId: string): Promise<boolean> => {
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds
  
  while (attempts < maxAttempts) {
    const response = await axios.get(`/files/${fileId}/scan-status`, {
      params: { orgId }
    });
    
    const status = response.data.virusScanStatus;
    
    if (status === 'clean') {
      return true;
    } else if (status === 'infected') {
      throw new Error('File infected with virus and has been deleted');
    } else if (status === 'error') {
      throw new Error('Virus scan failed');
    }
    
    // Still pending or scanning
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  throw new Error('Virus scan timeout');
};

// Update uploadLargeFile to wait for scan
export const uploadLargeFile = async (file, metadata, onProgress) => {
  // 1. Get presigned URL
  const { presignedUrl, fileId } = await generatePresignedUrl(file, metadata);
  
  // 2. Upload to S3 quarantine
  await axios.put(presignedUrl, file, {
    onUploadProgress: (e) => onProgress((e.loaded * 90) / e.total) // 90% for upload
  });
  
  // 3. Wait for virus scan
  onProgress(95); // Scanning...
  await waitForVirusScan(fileId, metadata.orgId);
  
  // 4. Confirm upload
  await confirmS3Upload(fileId, metadata.orgId);
  
  onProgress(100); // Done
  
  return { success: true, fileId };
};
```

#### Step 4: Add Scan Status Endpoint

```javascript
// Backend: Get scan status
router.get('/:fileId/scan-status', async (req, res) => {
  const { fileId } = req.params;
  const { orgId } = req.query;
  
  const file = await FileModel.findOne({ fileId, orgId });
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.json({
    fileId,
    virusScanStatus: file.virusScanStatus,
    virusScanResult: file.virusScanResult,
    virusScanDate: file.virusScanDate
  });
});

// Update scan status (called by Lambda)
router.post('/update-scan-status', async (req, res) => {
  const { s3Key, status, message, viruses } = req.body;
  
  const file = await FileModel.findOne({ s3Key });
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  file.virusScanStatus = status;
  file.virusScanResult = {
    isInfected: status === 'infected',
    viruses: viruses || [],
    message
  };
  file.virusScanDate = new Date();
  
  // If clean, update bucket to main bucket
  if (status === 'clean') {
    file.s3Bucket = process.env.S3_BUCKET_NAME;
  }
  
  await file.save();
  
  res.json({ success: true });
});
```

---

## 📊 Cost Analysis

### ClamAV (Self-hosted)

**Setup:**
- Docker container with ClamAV: $0 (open-source)
- Cloud Run additional memory: ~$5/month
- Daily definition updates: Included

**Operation:**
- Per scan: $0
- **Total: ~$5/month**

**Best for:** Small to medium deployments

---

### AWS Lambda + ClamAV

**Setup:**
- Lambda function: $0
- ClamAV Layer: $0
- S3 storage: $0.023/GB/month

**Operation:**
- Lambda invocations: $0.20 per 1M requests
- Lambda duration: $0.0000166667 per GB-second
- Typical 100MB file scan: ~5 seconds, 3GB memory = $0.00025

**Example (1000 files/day):**
- 30,000 scans/month: $6/month
- **Total: ~$6/month**

**Best for:** Medium to large deployments

---

### Cloudmersive API

**Pricing:**
- Free tier: 800 calls/month
- Basic: $9/month (5,000 calls)
- Professional: $49/month (50,000 calls)
- Enterprise: $199/month (500,000 calls)

**Per-file cost:** $0.002 - $0.004

**Example (1000 files/day):**
- 30,000 scans/month: $49/month (Professional plan)
- **Total: ~$49/month**

**Best for:** Quick setup, guaranteed uptime

---

## 🎯 Recommended Approach for CloudDock

### **Hybrid Strategy**

1. **Small Files (<10 MB)** - Synchronous ClamAV scan in backend
2. **Large Files (>10 MB)** - Asynchronous AWS Lambda scan

**Why?**
- ✅ Best user experience (immediate feedback for small files)
- ✅ No timeouts (async for large files)
- ✅ Cost-effective ($5-10/month for moderate usage)
- ✅ Full control (self-hosted ClamAV)
- ✅ Scalable (Lambda for spikes)

**Implementation:**
```javascript
export const uploadFile = async (req, res) => {
  const file = req.file;
  
  if (file.size < 10 * 1024 * 1024) {
    // Synchronous scan for small files
    const scanResult = await virusScanService.scanBuffer(file.buffer, file.originalname);
    if (scanResult.isInfected) {
      return res.status(400).json({ error: "Virus detected" });
    }
    // Upload to S3...
  } else {
    // Upload to quarantine, Lambda will scan asynchronously
    await uploadToQuarantine(file);
    return res.json({
      message: "File uploaded, scanning in progress",
      scanStatus: "pending"
    });
  }
};
```

---

## 📝 Summary

| Approach | Setup Complexity | Cost | Best For |
|----------|-----------------|------|----------|
| **ClamAV (Docker)** | Medium | $5/mo | Small scale |
| **Lambda + ClamAV** | High | $6/mo | Medium scale |
| **Cloudmersive API** | Low | $49/mo | Quick setup |
| **Hybrid** | High | $10/mo | Production (Recommended) |

---

## 🚀 Next Steps

1. Choose your approach based on scale and budget
2. Implement synchronous scanning for < 10MB files
3. Set up Lambda + quarantine bucket for > 10MB files
4. Update frontend to show scan status
5. Add admin dashboard for infected file reports
6. Schedule daily ClamAV definition updates
7. Monitor scan performance and adjust

---

**Generated:** November 16, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation ✅

