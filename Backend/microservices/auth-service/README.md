# Auth Service

Authentication service for CloudDock. Handles user registration, login, and JWT token management.

## Setup

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Update the `.env` file with your MongoDB and JWT credentials.

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
docker build -t clouddock-auth-service .
docker run -p 4001:4001 --env-file .env clouddock-auth-service
```

## API Endpoints

- `POST /auth/org/signup` - Register new organization with admin
- `POST /auth/user/signup` - Register new user in organization
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile (protected)
- `GET /health` - Health check

## Environment Variables

See `env.example` for all required environment variables.

