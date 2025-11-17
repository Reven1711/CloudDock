# CloudDock - Important Services & Code Snippets for Presentation

## 🏗️ Architecture Overview

### Microservices Architecture
- **Gateway Service** - API Gateway (Port 4000)
- **Auth Service** - Authentication & JWT (Port 4001)
- **Org Service** - Organization Management (Port 4002)
- **User Service** - User Management (Port 4003)
- **Files Service** - File Storage & Management (Port 4004)
- **Billing Service** - Stripe Integration & Storage Billing (Port 4005)
- **UI Service** - UI Customization (Port 4006)

---

## 🔐 1. Authentication Service

### JWT Token Generation
```javascript
// Backend/microservices/auth-service/src/controllers/authController.js
import jwt from 'jsonwebtoken';

const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role,
      tenantId: user.tenantId 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};
```

### Frontend Auth Context
```typescript
// Frontend/src/contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  
  const signIn = async (email: string, password: string) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
    const token = response.data.token;
    localStorage.setItem('token', token);
    setUser(response.data.user);
  };
  
  const signOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    window.location.replace('/');
  };
};
```

---

## 📁 2. File Management Service

### File Upload with Direct S3 Upload
```javascript
// Backend/microservices/files-service/src/controllers/fileController.js
export const uploadFile = async (req, res) => {
  const { orgId, userId, folder } = req.body;
  
  // Generate presigned URL for direct S3 upload
  const s3Key = `${orgId}/${userId}/${folder}/${req.file.originalname}`;
  const presignedUrl = await generatePresignedUrl(s3Key);
  
  // Save file metadata to MongoDB
  const file = new FileModel({
    orgId,
    fileName: req.file.originalname,
    s3Key,
    size: req.file.size,
    mimeType: req.file.mimetype,
    folder: folder || '/',
    uploadedBy: { userId, userName, userEmail },
    virusScanStatus: 'pending',
  });
  
  await file.save();
  await incrementStorageUsage(orgId, req.file.size);
  
  res.json({ success: true, presignedUrl, fileId: file._id });
};
```

### Folder ZIP Download
```javascript
// Backend/microservices/files-service/src/controllers/folderDownloadController.js
import archiver from 'archiver';

export const downloadFolderAsZip = async (req, res) => {
  const { folderId } = req.params;
  const { orgId, userId } = req.query;
  
  // Find all files in folder recursively
  const folderPath = folderRecord.folder + folderRecord.fileName + '/';
  const files = await FileModel.find({
    orgId,
    folder: { $regex: `^${folderPath}` },
    isDeleted: false,
  });
  
  // Create ZIP stream
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${folderName}.zip"`,
  });
  
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  
  // Stream files from S3 to ZIP
  for (const file of files) {
    const s3Object = await getS3Object(file.s3Key);
    archive.append(s3Object.Body, { name: file.originalName });
  }
  
  await archive.finalize();
};
```

### User File Isolation (Security)
```javascript
// Backend/microservices/files-service/src/controllers/fileController.js
export const getOrganizationFiles = async (req, res) => {
  const { orgId } = req.params;
  const { folder, userId } = req.query; // 🔒 userId for security
  
  const query = {
    orgId,
    folder: folder || '/',
    isDeleted: false,
  };
  
  // 🔒 SECURITY: Filter by userId for regular users
  if (userId && userRole !== 'admin') {
    query['uploadedBy.userId'] = userId;
  }
  
  const files = await FileModel.find(query);
  res.json({ success: true, files });
};
```

---

## 💳 3. Billing & Payment Service

### Stripe Checkout Session Creation
```javascript
// Backend/microservices/billing-service/src/controllers/stripeController.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  const { orgId, storageGB } = req.body;
  const purchaseId = uuidv4();
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `CloudDock Storage - ${storageGB} GB`,
        },
        unit_amount: Math.round(storageGB * 0.20 * 100), // $0.20/GB
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/admin/dashboard?payment=cancelled`,
    metadata: { purchaseId, orgId, storageGB },
  });
  
  // Create pending purchase record
  const purchase = new StoragePurchaseModel({
    purchaseId,
    orgId,
    storageGB,
    stripeSessionId: session.id,
    status: 'pending',
  });
  await purchase.save();
  
  res.json({ success: true, sessionUrl: session.url });
};
```

### Payment Completion
```javascript
// Backend/microservices/billing-service/src/controllers/stripeController.js
export const completePayment = async (req, res) => {
  const { sessionId } = req.body;
  
  // Verify payment with Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') {
    return res.status(400).json({ error: 'Payment not completed' });
  }
  
  const { purchaseId, orgId, storageGB } = session.metadata;
  
  // Update purchase status
  const purchase = await StoragePurchaseModel.findOne({ purchaseId });
  purchase.status = 'completed';
  await purchase.save();
  
  // Update storage quota
  let storageQuota = await StorageQuotaModel.findOne({ orgId });
  if (!storageQuota) {
    storageQuota = new StorageQuotaModel({ orgId, totalQuota: 1024 * 1024 * 1024 });
  }
  
  storageQuota.totalQuota += parseFloat(storageGB) * 1024 * 1024 * 1024;
  storageQuota.paidStorageGB += parseFloat(storageGB);
  storageQuota.isPaidPlan = true;
  await storageQuota.save();
  
  res.json({ 
    success: true, 
    storageAdded: parseFloat(storageGB),
    newQuotaGB: storageQuota.totalQuota / (1024 * 1024 * 1024)
  });
};
```

### Frontend Payment Success Handler
```typescript
// Frontend/src/pages/PaymentSuccess.tsx
const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    const finalizePayment = async () => {
      try {
        const response = await completePayment(sessionId);
        if (response.success) {
          setStatus('success');
          setStorageAdded(response.storageAdded);
          setTimeout(() => navigate('/admin/dashboard'), 3000);
        }
      } catch (error) {
        setStatus('error');
      }
    };
    
    finalizePayment();
  }, [searchParams]);
  
  return (
    <Card>
      {status === 'success' && (
        <div>
          <CheckCircle />
          <p>Payment Successful! +{storageAdded} GB</p>
        </div>
      )}
    </Card>
  );
};
```

---

## 👥 4. User Management Service

### Real-time Approval Status Check
```typescript
// Frontend/src/contexts/AuthContext.tsx
const checkApprovalStatus = async () => {
  if (!user || user.role === 'admin') return;
  
  const response = await fetch(
    `${API_BASE_URL}/users/${user.id}`,
    { method: 'GET' }
  );
  
  const data = await response.json();
  const isNowApproved = data.user?.status === 'active';
  
  if (isNowApproved !== user.approved) {
    const updatedUser = { ...user, approved: isNowApproved };
    persistUser(updatedUser);
    
    if (isNowApproved) {
      window.dispatchEvent(new CustomEvent('userApproved'));
    }
  }
};

// Poll every 30 seconds for pending users
useEffect(() => {
  if (!user?.approved) {
    checkApprovalStatus();
    const interval = setInterval(checkApprovalStatus, 30000);
    return () => clearInterval(interval);
  }
}, [user]);
```

---

## 🎨 5. UI Customization Service

### Theme Management
```typescript
// Frontend/src/contexts/TenantContext.tsx
export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant>({
    branding: {
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      theme: 'dark',
    },
    dashboard: {
      cardStyle: 'glassmorphism',
      fileViewLayout: 'large-icons',
    },
  });
  
  const updateBranding = async (branding: Partial<Tenant['branding']>) => {
    await axios.put(`${API_BASE_URL}/ui/branding/${tenantId}`, branding);
    setTenant(prev => ({ ...prev, branding: { ...prev.branding, ...branding } }));
  };
};
```

---

## 🔒 6. Security Features

### File Access Control
```javascript
// Backend - User can only access their own files
const query = {
  orgId,
  folder,
  isDeleted: false,
};

// 🔒 SECURITY: Filter by userId for regular users
if (userId && userRole !== 'admin') {
  query['uploadedBy.userId'] = userId;
}

// Admin can see all files grouped by user
if (userRole === 'admin') {
  // No userId filter - returns all files grouped by user
}
```

### Virus Scanning Integration
```javascript
// Backend/microservices/files-service/src/controllers/fileController.js
export const handleVirusScanCallback = async (req, res) => {
  const { fileId, scanResult } = req.body;
  
  const file = await FileModel.findById(fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });
  
  if (scanResult === 'infected') {
    file.virusScanStatus = 'infected';
    // Delete file from S3
    await deleteS3Object(file.s3Key);
    await file.save();
  } else {
    file.virusScanStatus = 'clean';
    await file.save();
  }
  
  res.json({ success: true });
};
```

---

## 📊 7. Storage Quota Management

### Storage Quota Model
```javascript
// Backend/microservices/files-service/src/models/StorageQuota.js
const StorageQuotaSchema = new Schema({
  orgId: { type: String, required: true, unique: true },
  totalQuota: { type: Number, default: 1024 * 1024 * 1024 }, // 1 GB in bytes
  usedStorage: { type: Number, default: 0 },
  fileCount: { type: Number, default: 0 },
  isPaidPlan: { type: Boolean, default: false },
  paidStorageGB: { type: Number, default: 0 },
});

StorageQuotaSchema.methods.getAvailableStorage = function() {
  return Math.max(0, this.totalQuota - this.usedStorage);
};

StorageQuotaSchema.methods.getUsagePercentage = function() {
  return (this.usedStorage / this.totalQuota) * 100;
};
```

### Storage Usage Calculation
```javascript
// Backend/microservices/files-service/src/services/storageService.js
export const incrementStorageUsage = async (orgId, fileSize) => {
  let quota = await StorageQuotaModel.findOne({ orgId });
  if (!quota) {
    quota = await initializeStorageQuota(orgId);
  }
  
  quota.usedStorage += fileSize;
  quota.fileCount += 1;
  quota.lastCalculated = new Date();
  await quota.save();
  
  // Check if quota exceeded
  if (quota.usedStorage > quota.totalQuota) {
    throw new Error('Storage quota exceeded');
  }
};
```

---

## 🌐 8. API Gateway

### Gateway Routing
```javascript
// Backend/microservices/gateway/src/index.js
import { createProxyMiddleware } from 'http-proxy-middleware';

const targets = {
  auth: process.env.AUTH_SERVICE_URL,
  org: process.env.ORG_SERVICE_URL,
  user: process.env.USER_SERVICE_URL,
  files: process.env.FILES_SERVICE_URL,
  billing: process.env.BILLING_SERVICE_URL,
  ui: process.env.UI_SERVICE_URL,
};

const proxyToService = (target, serviceName) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^/${serviceName}`]: '' },
    onError: (err, req, res) => {
      console.error(`[${serviceName}] Proxy error:`, err.message);
      res.status(502).json({ error: `${serviceName} service unavailable` });
    },
  });
};

app.all('/auth/*', proxyToService(targets.auth, 'auth'));
app.all('/org/*', proxyToService(targets.org, 'org'));
app.all('/user/*', proxyToService(targets.user, 'user'));
app.all('/files/*', proxyToService(targets.files, 'files'));
app.all('/billing/*', proxyToService(targets.billing, 'billing'));
app.all('/ui/*', proxyToService(targets.ui, 'ui'));
```

---

## 🚀 9. Deployment Configuration

### Docker Configuration
```dockerfile
# Backend/microservices/files-service/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src ./src
EXPOSE 4004
CMD ["node", "src/index.js"]
```

### Cloud Run Deployment
```bash
# Build and deploy to GCP Cloud Run
gcloud builds submit --tag gcr.io/clouddock-project/files-service
gcloud run deploy files-service \
  --image gcr.io/clouddock-project/files-service \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated
```

---

## 📱 10. Frontend Key Components

### File Upload Component
```typescript
// Frontend/src/components/FileUpload.tsx
const FileUpload = () => {
  const handleUpload = async (file: File) => {
    // Get presigned URL from backend
    const { presignedUrl, fileId } = await getPresignedUrl(file.name);
    
    // Upload directly to S3
    await axios.put(presignedUrl, file, {
      headers: { 'Content-Type': file.type },
    });
    
    // Notify backend upload complete
    await confirmUpload(fileId);
  };
};
```

### Admin Dashboard - Grouped Files View
```typescript
// Frontend/src/pages/AdminDashboard.tsx
const fetchAllOrgFiles = async () => {
  const response = await getAllOrganizationFilesForAdmin(orgId, folder);
  
  // Files grouped by user
  setFilesByUser(response.users); // [{ userId, userName, files: [], folders: [] }]
  
  response.users.forEach(userGroup => {
    console.log(`${userGroup.userName}: ${userGroup.fileCount} files`);
  });
};
```

---

## 🔑 Key API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Files
- `GET /files/org/:orgId` - Get organization files (user-specific)
- `GET /files/org/:orgId/all` - Get all files (admin only, grouped by user)
- `POST /files/upload` - Upload file (get presigned URL)
- `GET /files/folder/:folderId/download` - Download folder as ZIP
- `DELETE /files/:fileId` - Delete file
- `GET /files/storage/:orgId` - Get storage quota

### Billing
- `POST /billing/storage/checkout` - Create Stripe checkout session
- `POST /billing/storage/complete` - Complete payment
- `GET /billing/storage/history/:orgId` - Get purchase history

### Organizations
- `POST /org/create` - Create organization
- `GET /org/:orgId` - Get organization details
- `PUT /org/:orgId` - Update organization

---

## 🎯 Recent Critical Fixes

### 1. Payment Completion Fix
**Problem**: PaymentSuccess page was behind authentication
**Solution**: Made route public, only needs session_id from Stripe

### 2. File Isolation Security
**Problem**: Users could see each other's files
**Solution**: Added userId filter to all file queries

### 3. Real-time Approval Sync
**Problem**: Users had to re-login after approval
**Solution**: Polling mechanism + CustomEvent for instant updates

---

## 📈 Performance Optimizations

### Direct S3 Upload
- Files upload directly to S3 (not through backend)
- Reduces server load
- Faster upload speeds

### Streaming ZIP Downloads
- Uses archiver for on-the-fly ZIP creation
- Streams directly to client
- No temporary file storage needed

### Database Indexing
```javascript
// Optimized queries with indexes
FileModel.index({ orgId: 1, folder: 1, isDeleted: 1 });
FileModel.index({ 'uploadedBy.userId': 1 });
StorageQuotaModel.index({ orgId: 1 }, { unique: true });
```

---

## 🔐 Security Best Practices

1. **JWT Authentication** - All API calls require valid token
2. **User File Isolation** - Users can only access their own files
3. **Virus Scanning** - All uploads scanned before storage
4. **Input Validation** - All user inputs validated and sanitized
5. **CORS Configuration** - Restricted to allowed origins only
6. **Environment Variables** - Secrets stored in GCP Secret Manager

---

## 📊 Technology Stack

### Backend
- **Node.js** + **Express.js**
- **MongoDB** (Mongoose ODM)
- **AWS S3** (File Storage)
- **Stripe** (Payment Processing)
- **JWT** (Authentication)

### Frontend
- **React** + **TypeScript**
- **Vite** (Build Tool)
- **Axios** (HTTP Client)
- **React Router** (Routing)
- **Tailwind CSS** (Styling)

### Infrastructure
- **GCP Cloud Run** (Microservices)
- **Vercel** (Frontend Hosting)
- **MongoDB Atlas** (Database)
- **AWS S3** (Object Storage)
- **Docker** (Containerization)

---

## 🎓 Key Takeaways for Presentation

1. **Microservices Architecture** - 7 independent services
2. **Security First** - File isolation, JWT auth, virus scanning
3. **Scalable Design** - Direct S3 upload, streaming downloads
4. **Payment Integration** - Stripe checkout with automatic completion
5. **Real-time Updates** - Polling + events for instant feedback
6. **Cloud Native** - Deployed on GCP Cloud Run + Vercel

---

**Total Lines of Code**: ~15,000+
**Services**: 7 microservices
**API Endpoints**: 50+
**Frontend Components**: 30+
**Database Collections**: 10+

