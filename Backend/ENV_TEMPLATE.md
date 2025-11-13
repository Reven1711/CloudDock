# Environment Variables Template

Copy this content to create your `Backend/.env` file:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.mongodb.net/CloudDock?retryWrites=true&w=majority
MONGODB_DB_NAME=CloudDock

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
NODE_ENV=development
PORT=4000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:4173,http://localhost:8080
FRONTEND_URL=http://localhost:5173

# AWS S3 Configuration (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-clouddock-bucket

# Stripe Payment Configuration (REQUIRED for storage upgrades)
# Get your keys from: https://dashboard.stripe.com/test/apikeys
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Service Ports
AUTH_SERVICE_PORT=4001
ORG_SERVICE_PORT=4002
USER_SERVICE_PORT=4003
FILES_SERVICE_PORT=4004
BILLING_SERVICE_PORT=4005
UI_SERVICE_PORT=4006
```

## 🔐 Security Notes

1. **NEVER commit your `.env` file to Git** - it contains sensitive credentials
2. The `.env` file is already in `.gitignore`
3. Only share example/template files like this one
4. Use different keys for development, staging, and production

## 📝 How to Use

1. Create a new file at `Backend/.env`
2. Copy the template above
3. Replace the placeholder values with your actual credentials
4. Save the file
5. Restart your backend services

## 🔑 Getting Your Keys

### Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Toggle to **Test Mode**
3. You'll see two keys:
   - **Publishable key** (`pk_test_...`): Frontend-safe (optional for now)
   - **Secret key** (`sk_test_...`): Backend only (REQUIRED)
4. Copy both keys and add them to your `.env` file

**Important:**

- The **Secret Key** is REQUIRED for payment processing
- The **Publishable Key** is optional (not currently used, but good to have for future features)
- Never commit these keys to Git!

### AWS Keys

1. Go to AWS IAM Console
2. Create a new user with S3 permissions
3. Generate access keys
4. Use them for `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### MongoDB URI

1. Go to MongoDB Atlas
2. Click "Connect" on your cluster
3. Copy the connection string
4. Replace `<password>` with your actual password
