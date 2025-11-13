# CloudDock Microservices

CloudDock backend restructured into isolated microservices for easy Docker deployment.

## 📁 Architecture

```
microservices/
├── gateway/              # API Gateway (routes requests to services)
├── auth-service/         # Authentication & authorization
├── org-service/          # Organization management
├── user-service/         # User management
├── files-service/        # File storage & management (S3)
├── billing-service/      # Payment processing (Stripe)
├── ui-service/           # UI customization
├── docker-compose.yml    # Docker orchestration
└── .env.example          # Environment variables template
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose installed
- MongoDB Atlas account (or local MongoDB)
- AWS S3 bucket (for file storage)
- Stripe account (for payments)

### Setup

1. **Copy environment variables**:
   ```bash
   cd Backend/microservices
   cp .env.example .env
   ```

2. **Edit `.env` file** with your credentials:
   - MongoDB URI (or use the included MongoDB container)
   - JWT secret
   - AWS credentials & S3 bucket name
   - Stripe API keys
   - Frontend URL

3. **Build and start all services**:
   ```bash
   docker-compose up --build
   ```

4. **Or start individual services**:
   ```bash
   # Start only gateway and auth service
   docker-compose up gateway auth-service mongodb
   ```

## 🔧 Development

### Local Development (without Docker)

Each service can be run independently for development:

```bash
# Navigate to a service directory
cd auth-service

# Copy environment variables
cp env.example .env

# Install dependencies
npm install

# Start the service
npm start

# Or use watch mode
npm run dev
```

### Service Ports

- **Gateway**: 4000
- **Auth Service**: 4001
- **Org Service**: 4002
- **User Service**: 4003
- **Files Service**: 4004
- **Billing Service**: 4005
- **UI Service**: 4006
- **MongoDB**: 27017

## 🐳 Docker Deployment

### Build Individual Services

```bash
# Build a specific service
docker build -t clouddock-auth-service ./auth-service

# Run it
docker run -p 4001:4001 --env-file ./auth-service/.env clouddock-auth-service
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

## 📦 Service Details

### Gateway Service
- Routes requests to appropriate microservices
- Handles CORS
- No database dependency

### Auth Service
- User authentication (login, signup)
- JWT token generation
- Organization creation
- Dependencies: MongoDB

### Org Service
- Organization data management
- Organization listing
- Dependencies: MongoDB

### User Service
- User management
- User approval/rejection
- User listing
- Dependencies: MongoDB

### Files Service
- File upload/download
- S3 integration
- Storage quota management
- Virus scanning (optional)
- Dependencies: MongoDB, AWS S3, AWS Lambda (optional)

### Billing Service
- Stripe payment processing
- Storage purchase
- Purchase history
- Webhook handling
- Dependencies: MongoDB, Stripe

### UI Service
- Organization-specific UI customization
- Theme management
- Layout preferences
- Dependencies: MongoDB

## 🔐 Environment Variables

Each service has its own environment variables. See `env.example` in each service directory for details.

**Required for all services**:
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB_NAME` - Database name (default: CloudDock)

**Required for specific services**:
- `JWT_SECRET` - Auth service
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` - Files service
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Billing service

## 🧪 Testing

Each service can be tested independently:

```bash
# Health check
curl http://localhost:4001/health

# Test auth service
curl -X POST http://localhost:4000/auth/org/signup \
  -H "Content-Type: application/json" \
  -d '{"orgName":"Test Org","adminName":"Admin","adminEmail":"admin@test.com","password":"password123"}'
```

## 📝 API Documentation

Each service has its own README with detailed API documentation:
- [Gateway README](./gateway/README.md)
- [Auth Service README](./auth-service/README.md)
- [Org Service README](./org-service/README.md)
- [User Service README](./user-service/README.md)
- [Files Service README](./files-service/README.md)
- [Billing Service README](./billing-service/README.md)
- [UI Service README](./ui-service/README.md)

## 🔄 Migration from Monolith

If you're migrating from the original monolithic structure:

1. The gateway exposes the same API endpoints on port 4000
2. Update your frontend to point to `http://localhost:4000` (gateway)
3. Each service is isolated with its own dependencies
4. MongoDB is shared across all services (same database, different collections)

## 🛠️ Troubleshooting

### Services won't start
- Check if ports are already in use
- Verify environment variables in `.env`
- Check Docker logs: `docker-compose logs <service-name>`

### MongoDB connection issues
- Ensure MongoDB is running: `docker-compose ps`
- Check MongoDB URI in environment variables
- For MongoDB Atlas, whitelist your IP address

### File upload issues
- Verify AWS credentials
- Check S3 bucket permissions
- Ensure S3 bucket exists

### Payment issues
- Verify Stripe API keys
- Check Stripe dashboard for errors
- Ensure webhook endpoint is configured (production)

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Stripe Documentation](https://stripe.com/docs)

## 🤝 Contributing

When adding new features:
1. Create a new service directory if needed
2. Follow the existing structure (src/, Dockerfile, README.md, etc.)
3. Add service to `docker-compose.yml`
4. Update gateway routing if needed
5. Document environment variables

## 📄 License

See the main project LICENSE file.

