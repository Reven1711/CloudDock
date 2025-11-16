# GCP Cloud Run Deployment Guide

## 📋 Prerequisites

1. **Google Cloud Platform Account**
   - Active GCP project
   - Billing enabled

2. **Google Cloud SDK (gcloud CLI)**
   - Install from: https://cloud.google.com/sdk/docs/install
   - Verify installation: `gcloud --version`

3. **Authentication**
   ```bash
   gcloud auth login
   gcloud auth configure-docker
   ```

4. **Set your GCP Project ID**
   ```bash
   # Linux/Mac
   export GCP_PROJECT_ID="your-project-id"
   export GCP_REGION="us-central1"  # Optional, defaults to us-central1
   
   # Windows (Command Prompt)
   set GCP_PROJECT_ID=your-project-id
   set GCP_REGION=us-central1
   
   # Windows (PowerShell)
   $env:GCP_PROJECT_ID="your-project-id"
   $env:GCP_REGION="us-central1"
   ```

---

## 🚀 Quick Deployment (Files Service Only)

### After making changes to the files-service, deploy just that service:

#### Linux/Mac:
```bash
cd Backend/microservices
chmod +x deploy-files-service.sh
./deploy-files-service.sh
```

#### Windows (Command Prompt):
```cmd
cd Backend\microservices
deploy-files-service.bat
```

#### Manual Deployment (any OS):
```bash
cd Backend/microservices/files-service

# Build and push Docker image
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/clouddock-files-service:latest

# Deploy to Cloud Run
gcloud run deploy clouddock-files-service \
  --image gcr.io/YOUR-PROJECT-ID/clouddock-files-service:latest \
  --platform managed \
  --region us-central1 \
  --port 4004 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300
```

---

## 🔧 Full Deployment (All Services)

### Deploy all microservices at once:

#### Linux/Mac:
```bash
cd Backend/microservices
chmod +x deploy-to-gcp.sh
./deploy-to-gcp.sh
```

#### Manual Deployment of All Services:

```bash
cd Backend/microservices

# 1. Gateway (API Gateway)
cd gateway
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/clouddock-gateway:latest
gcloud run deploy clouddock-gateway \
  --image gcr.io/YOUR-PROJECT-ID/clouddock-gateway:latest \
  --platform managed \
  --region us-central1 \
  --port 4000 \
  --allow-unauthenticated \
  --memory 256Mi
cd ..

# 2. Auth Service
cd auth-service
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/clouddock-auth-service:latest
gcloud run deploy clouddock-auth-service \
  --image gcr.io/YOUR-PROJECT-ID/clouddock-auth-service:latest \
  --platform managed \
  --region us-central1 \
  --port 4001 \
  --allow-unauthenticated \
  --memory 256Mi
cd ..

# 3. Org Service
cd org-service
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/clouddock-org-service:latest
gcloud run deploy clouddock-org-service \
  --image gcr.io/YOUR-PROJECT-ID/clouddock-org-service:latest \
  --platform managed \
  --region us-central1 \
  --port 4002 \
  --allow-unauthenticated \
  --memory 256Mi
cd ..

# 4. User Service
cd user-service
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/clouddock-user-service:latest
gcloud run deploy clouddock-user-service \
  --image gcr.io/YOUR-PROJECT-ID/clouddock-user-service:latest \
  --platform managed \
  --region us-central1 \
  --port 4003 \
  --allow-unauthenticated \
  --memory 256Mi
cd ..

# 5. Files Service (with folder size fix)
cd files-service
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/clouddock-files-service:latest
gcloud run deploy clouddock-files-service \
  --image gcr.io/YOUR-PROJECT-ID/clouddock-files-service:latest \
  --platform managed \
  --region us-central1 \
  --port 4004 \
  --allow-unauthenticated \
  --memory 512Mi
cd ..

# 6. Billing Service
cd billing-service
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/clouddock-billing-service:latest
gcloud run deploy clouddock-billing-service \
  --image gcr.io/YOUR-PROJECT-ID/clouddock-billing-service:latest \
  --platform managed \
  --region us-central1 \
  --port 4005 \
  --allow-unauthenticated \
  --memory 256Mi
cd ..

# 7. UI Service
cd ui-service
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/clouddock-ui-service:latest
gcloud run deploy clouddock-ui-service \
  --image gcr.io/YOUR-PROJECT-ID/clouddock-ui-service:latest \
  --platform managed \
  --region us-central1 \
  --port 4006 \
  --allow-unauthenticated \
  --memory 256Mi
cd ..
```

---

## 🔐 Environment Variables

### Setting Environment Variables in Cloud Run

Cloud Run services need environment variables for database connections, API keys, etc.

#### Option 1: Set via Command Line
```bash
gcloud run deploy clouddock-files-service \
  --image gcr.io/YOUR-PROJECT-ID/clouddock-files-service:latest \
  --set-env-vars="MONGODB_URI=mongodb+srv://...,AWS_ACCESS_KEY_ID=...,AWS_SECRET_ACCESS_KEY=...,S3_BUCKET_NAME=..."
```

#### Option 2: Update Existing Service
```bash
# Add new environment variables
gcloud run services update clouddock-files-service \
  --region us-central1 \
  --set-env-vars="NEW_VAR=value"

# Update all environment variables from file
gcloud run services update clouddock-files-service \
  --region us-central1 \
  --env-vars-file=.env.yaml
```

#### Option 3: Use Secret Manager (Recommended for sensitive data)
```bash
# Create secret
echo -n "your-secret-value" | gcloud secrets create my-secret --data-file=-

# Use in Cloud Run
gcloud run deploy clouddock-files-service \
  --set-secrets="MY_SECRET=my-secret:latest"
```

---

## 🔗 Service URLs and Gateway Configuration

After deployment, get your service URLs:

```bash
# Get all service URLs
gcloud run services list --platform managed --region us-central1

# Get specific service URL
gcloud run services describe clouddock-gateway \
  --platform managed \
  --region us-central1 \
  --format "value(status.url)"
```

### Update Gateway Environment Variables

The gateway needs to know the URLs of all backend services:

```bash
gcloud run services update clouddock-gateway \
  --region us-central1 \
  --set-env-vars="AUTH_SERVICE_URL=https://clouddock-auth-service-xxx.run.app,ORG_SERVICE_URL=https://clouddock-org-service-xxx.run.app,USER_SERVICE_URL=https://clouddock-user-service-xxx.run.app,FILE_SERVICE_URL=https://clouddock-files-service-xxx.run.app,BILLING_SERVICE_URL=https://clouddock-billing-service-xxx.run.app,UI_SERVICE_URL=https://clouddock-ui-service-xxx.run.app"
```

### Update Frontend

Update your frontend's `.env` file with the gateway URL:

```bash
VITE_API_BASE_URL=https://clouddock-gateway-xxx.run.app
```

---

## 📊 Monitoring and Logs

### View Logs
```bash
# View logs for files-service
gcloud run services logs read clouddock-files-service \
  --platform managed \
  --region us-central1 \
  --limit 50

# Follow logs in real-time
gcloud run services logs tail clouddock-files-service \
  --platform managed \
  --region us-central1
```

### View Service Details
```bash
gcloud run services describe clouddock-files-service \
  --platform managed \
  --region us-central1
```

---

## 💰 Cost Optimization

### Cloud Run Pricing
- **Free Tier**: 2 million requests/month
- **Charges**: CPU, memory, and requests beyond free tier
- **Idle Services**: Set `--min-instances 0` (default) to scale to zero when not in use

### Recommended Settings for Development/Testing:
```bash
--min-instances 0 \
--max-instances 5 \
--memory 256Mi \
--cpu 1
```

### Recommended Settings for Production:
```bash
--min-instances 1 \
--max-instances 20 \
--memory 512Mi \
--cpu 1 \
--concurrency 80
```

---

## 🐛 Troubleshooting

### Issue: "Permission denied" during deployment
```bash
# Ensure you have the right permissions
gcloud projects add-iam-policy-binding YOUR-PROJECT-ID \
  --member="user:your-email@example.com" \
  --role="roles/run.admin"
```

### Issue: Service not accessible
```bash
# Make service publicly accessible
gcloud run services add-iam-policy-binding clouddock-files-service \
  --region us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

### Issue: Environment variables not loading
```bash
# Check current environment variables
gcloud run services describe clouddock-files-service \
  --region us-central1 \
  --format "value(spec.template.spec.containers[0].env)"
```

### Issue: Build fails
```bash
# Check Cloud Build logs
gcloud builds list --limit 5

# View specific build
gcloud builds log <BUILD-ID>
```

---

## ✅ Verification

After deployment, verify the folder size fix is working:

1. **Test the API endpoint**:
   ```bash
   curl https://clouddock-files-service-xxx.run.app/files/org/YOUR-ORG-ID?folder=/
   ```

2. **Check frontend**: Navigate to "My Files" and verify folders show correct sizes

3. **Monitor logs**: Check for any errors
   ```bash
   gcloud run services logs tail clouddock-files-service --region us-central1
   ```

---

## 📝 Notes

- **Image Updates**: Cloud Run automatically pulls the latest `:latest` tag on each deployment
- **Zero Downtime**: Cloud Run handles gradual traffic migration during updates
- **Rollback**: Use `gcloud run revisions list` and `gcloud run services update-traffic` to rollback if needed
- **Custom Domains**: Set up custom domains via Cloud Run console or CLI

---

## 🔄 Quick Reference

```bash
# Deploy files-service only
cd Backend/microservices
./deploy-files-service.sh  # or .bat on Windows

# View service URL
gcloud run services describe clouddock-files-service \
  --region us-central1 \
  --format "value(status.url)"

# View logs
gcloud run services logs tail clouddock-files-service --region us-central1

# List all services
gcloud run services list --region us-central1

# Delete a service
gcloud run services delete clouddock-files-service --region us-central1
```

---

**Happy Deploying! 🚀**

