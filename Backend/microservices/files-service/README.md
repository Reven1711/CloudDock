# Files Service

File management service for CloudDock with AWS S3 integration, virus scanning, and storage quota management.

## Setup

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Update the `.env` file with your MongoDB, AWS S3, and Lambda credentials.

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the service:
   ```bash
   npm start
   ```

## Docker Build

```bash
docker build -t clouddock-files-service .
docker run -p 4004:4004 --env-file .env clouddock-files-service
```

## API Endpoints

- `POST /files/upload` - Upload a file
- `POST /files/folder` - Create a folder
- `GET /files/:fileId` - Get file details
- `GET /files/:fileId/download` - Get presigned download URL
- `DELETE /files/:fileId` - Delete a file
- `GET /files/org/:orgId` - Get all files for an organization
- `GET /files/storage/:orgId` - Get storage quota information
- `POST /files/virus-scan-callback` - Webhook for virus scan results
- `GET /health` - Health check

## Environment Variables

See `env.example` for all required environment variables including AWS S3 configuration.

## Features

- AWS S3 file storage
- Storage quota management
- Virus scanning with AWS Lambda (optional)
- Presigned URLs for secure downloads
- Folder organization
- File soft deletion

