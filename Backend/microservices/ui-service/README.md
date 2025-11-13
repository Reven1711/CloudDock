# UI Service

UI customization service for CloudDock. Manages organization-specific UI settings and preferences.

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
docker build -t clouddock-ui-service .
docker run -p 4006:4006 --env-file .env clouddock-ui-service
```

## API Endpoints

- `GET /ui/:tenantId` - Get UI settings for an organization
- `PATCH /ui/:tenantId` - Update UI settings for an organization
- `GET /health` - Health check

## Environment Variables

See `env.example` for all required environment variables.

## Features

- Organization-specific UI customization
- Theme management (light/dark)
- Color scheme customization
- Layout preferences
- Feature flags
- Logo URL management

