# Deploy Folder Size Calculation Fix to GCP Cloud Run

## 🎯 What Changed

The files-service has been updated to calculate folder sizes dynamically. This fix ensures folders display the total size of all their contents (including nested folders and files).

## 🚀 Quick Deployment Steps

### Step 1: Set Your GCP Project ID

**Windows (Command Prompt):**
```cmd
set GCP_PROJECT_ID=your-project-id-here
```

**Windows (PowerShell):**
```powershell
$env:GCP_PROJECT_ID="your-project-id-here"
```

**Linux/Mac:**
```bash
export GCP_PROJECT_ID="your-project-id-here"
```

### Step 2: Deploy the Updated Files Service

**Windows:**
```cmd
cd Backend\microservices
deploy-files-service.bat
```

**Linux/Mac:**
```bash
cd Backend/microservices
chmod +x deploy-files-service.sh
./deploy-files-service.sh
```

### Step 3: Verify Deployment

After deployment completes, you should see:
```
✅ files-service deployed successfully! 🚀
Service URL: https://clouddock-files-service-xxx.run.app
```

## ⏱️ Expected Time

- **Build time**: ~2-5 minutes
- **Deployment time**: ~1-2 minutes
- **Total**: ~3-7 minutes

## ✅ Verification

1. **Check Service Status:**
   ```bash
   gcloud run services describe clouddock-files-service \
     --platform managed \
     --region us-central1 \
     --format "value(status.url)"
   ```

2. **View Logs:**
   ```bash
   gcloud run services logs tail clouddock-files-service \
     --platform managed \
     --region us-central1
   ```

3. **Test in Frontend:**
   - Navigate to your CloudDock application
   - Go to "My Files"
   - Check that folders now show their actual size (not 0 B)

## 🐛 Troubleshooting

### Error: "gcloud: command not found"
**Solution:** Install Google Cloud SDK
- Download from: https://cloud.google.com/sdk/docs/install
- Windows installer: `GoogleCloudSDKInstaller.exe` (may already be in your Frontend folder)

### Error: "Permission denied"
**Solution:** Authenticate with GCP
```bash
gcloud auth login
gcloud config set project YOUR-PROJECT-ID
```

### Error: "API not enabled"
**Solution:** Enable required APIs
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

### Deployment succeeds but folder sizes still show 0 B
**Possible causes:**
1. **Frontend cache**: Hard refresh your browser (Ctrl+F5)
2. **Gateway not updated**: The gateway might be caching old service URLs
3. **Check service URL**: Ensure the gateway is pointing to the new files-service URL

**To verify gateway configuration:**
```bash
gcloud run services describe clouddock-gateway \
  --region us-central1 \
  --format "value(spec.template.spec.containers[0].env)"
```

Look for `FILE_SERVICE_URL` - it should match your files-service URL.

## 📋 What Happens During Deployment

1. **Build Phase** (~2-5 min):
   - Docker image is built with updated code
   - Image is pushed to Google Container Registry (gcr.io)

2. **Deploy Phase** (~1-2 min):
   - New revision is created in Cloud Run
   - Traffic is gradually shifted to new revision
   - Old revision is kept for rollback if needed

3. **Verification**:
   - Service URL is displayed
   - Service becomes immediately accessible

## 🔄 Rollback (if needed)

If something goes wrong, you can rollback to the previous version:

```bash
# List all revisions
gcloud run revisions list \
  --service clouddock-files-service \
  --region us-central1

# Route 100% traffic to previous revision
gcloud run services update-traffic clouddock-files-service \
  --region us-central1 \
  --to-revisions PREVIOUS-REVISION-NAME=100
```

## 📊 Monitor Performance

After deployment, monitor the service:

```bash
# View recent logs
gcloud run services logs read clouddock-files-service \
  --region us-central1 \
  --limit 50

# Follow logs in real-time
gcloud run services logs tail clouddock-files-service \
  --region us-central1
```

## 💡 Tips

1. **First-time deployment?** See `Backend/microservices/GCP_DEPLOYMENT_GUIDE.md` for complete setup instructions

2. **Environment Variables**: The deployment script automatically carries over existing environment variables. No need to re-enter them.

3. **Zero Downtime**: Cloud Run handles gradual traffic migration, so your service stays available during updates.

4. **Cost**: With min-instances=0, the service scales to zero when idle, minimizing costs.

## 📝 Next Steps

After successful deployment:

1. ✅ Test folder sizes in your application
2. ✅ Verify nested folders show correct cumulative sizes
3. ✅ Upload new files and confirm folder sizes update
4. ✅ Check application logs for any errors

## 🎉 Success!

Your CloudDock application now correctly displays folder sizes! 

- Folders show total size of all contents
- Sizes include nested folders and files
- Updates automatically when files are added/removed

---

**Need Help?**
- Full deployment guide: `Backend/microservices/GCP_DEPLOYMENT_GUIDE.md`
- Technical details: `FOLDER_SIZE_FIX.md`
- GCP Cloud Run docs: https://cloud.google.com/run/docs

