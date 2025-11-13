# Gateway Service

API Gateway for CloudDock microservices. Routes requests to the appropriate backend services.

## Setup

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the service:
   ```bash
   npm start
   ```

## Docker Build

```bash
docker build -t clouddock-gateway .
docker run -p 4000:4000 --env-file .env clouddock-gateway
```

## Environment Variables

See `env.example` for all available configuration options.

