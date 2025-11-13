# User Service

User management service for CloudDock. Handles user listing, approval, and rejection.

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
docker build -t clouddock-user-service .
docker run -p 4003:4003 --env-file .env clouddock-user-service
```

## API Endpoints

- `GET /users/org/:tenantId` - Get all users in an organization
- `GET /users/pending/:tenantId` - Get pending users in an organization
- `POST /users/:userId/approve` - Approve a pending user
- `POST /users/:userId/reject` - Reject and remove a pending user
- `GET /health` - Health check

## Environment Variables

See `env.example` for all required environment variables.

