# Organization Service

Organization management service for CloudDock. Handles organization data and retrieval.

## Setup

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Update the `.env` file with your MongoDB credentials.

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
docker build -t clouddock-org-service .
docker run -p 4002:4002 --env-file .env clouddock-org-service
```

## API Endpoints

- `GET /org` - Get all organizations
- `GET /org/:tenantId` - Get specific organization by tenantId
- `GET /health` - Health check

## Environment Variables

See `env.example` for all required environment variables.

