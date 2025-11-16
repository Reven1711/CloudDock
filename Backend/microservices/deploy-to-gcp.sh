#!/bin/bash

# CloudDock Microservices - GCP Cloud Run Deployment Script
# This script builds and deploys all microservices to GCP Cloud Run

set -e  # Exit on error

# Configuration
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
REGISTRY="gcr.io"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    print_error "GCP_PROJECT_ID environment variable is not set"
    echo "Usage: GCP_PROJECT_ID=your-project-id ./deploy-to-gcp.sh"
    exit 1
fi

print_info "Deploying CloudDock microservices to GCP Cloud Run"
print_info "Project: $PROJECT_ID"
print_info "Region: $REGION"
echo ""

# Set the active project
print_info "Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
print_info "Enabling required GCP APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    --quiet

# Array of services to deploy
SERVICES=(
    "gateway:4000"
    "auth-service:4001"
    "org-service:4002"
    "user-service:4003"
    "files-service:4004"
    "billing-service:4005"
    "ui-service:4006"
)

# Function to build and deploy a service
deploy_service() {
    local SERVICE_NAME=$1
    local SERVICE_PORT=$2
    local SERVICE_DIR="${SERVICE_NAME}"
    
    print_info "Building and deploying ${SERVICE_NAME}..."
    
    # Navigate to service directory
    cd "${SERVICE_DIR}"
    
    # Build the Docker image
    print_info "Building Docker image for ${SERVICE_NAME}..."
    IMAGE_NAME="${REGISTRY}/${PROJECT_ID}/clouddock-${SERVICE_NAME}:latest"
    
    gcloud builds submit \
        --tag "${IMAGE_NAME}" \
        --quiet
    
    if [ $? -eq 0 ]; then
        print_success "Docker image built successfully for ${SERVICE_NAME}"
    else
        print_error "Failed to build Docker image for ${SERVICE_NAME}"
        cd ..
        return 1
    fi
    
    # Deploy to Cloud Run
    print_info "Deploying ${SERVICE_NAME} to Cloud Run..."
    
    # Load environment variables from .env file if it exists
    ENV_VARS=""
    if [ -f ".env" ]; then
        # Convert .env to Cloud Run format (KEY=VALUE,KEY2=VALUE2)
        ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | tr '\n' ',' | sed 's/,$//')
    fi
    
    # Deploy with environment variables
    if [ -n "$ENV_VARS" ]; then
        gcloud run deploy "clouddock-${SERVICE_NAME}" \
            --image "${IMAGE_NAME}" \
            --platform managed \
            --region "${REGION}" \
            --port "${SERVICE_PORT}" \
            --set-env-vars="${ENV_VARS}" \
            --allow-unauthenticated \
            --memory 512Mi \
            --cpu 1 \
            --min-instances 0 \
            --max-instances 10 \
            --timeout 300 \
            --quiet
    else
        print_warning "No .env file found for ${SERVICE_NAME}, deploying without environment variables"
        gcloud run deploy "clouddock-${SERVICE_NAME}" \
            --image "${IMAGE_NAME}" \
            --platform managed \
            --region "${REGION}" \
            --port "${SERVICE_PORT}" \
            --allow-unauthenticated \
            --memory 512Mi \
            --cpu 1 \
            --min-instances 0 \
            --max-instances 10 \
            --timeout 300 \
            --quiet
    fi
    
    if [ $? -eq 0 ]; then
        print_success "${SERVICE_NAME} deployed successfully"
        
        # Get the service URL
        SERVICE_URL=$(gcloud run services describe "clouddock-${SERVICE_NAME}" \
            --platform managed \
            --region "${REGION}" \
            --format 'value(status.url)')
        
        echo "  📍 Service URL: ${SERVICE_URL}"
    else
        print_error "Failed to deploy ${SERVICE_NAME}"
        cd ..
        return 1
    fi
    
    cd ..
    echo ""
}

# Main deployment loop
print_info "Starting deployment of all services..."
echo ""

DEPLOYMENT_SUMMARY=""
FAILED_SERVICES=""

for SERVICE_INFO in "${SERVICES[@]}"; do
    IFS=':' read -r SERVICE_NAME SERVICE_PORT <<< "$SERVICE_INFO"
    
    if deploy_service "$SERVICE_NAME" "$SERVICE_PORT"; then
        DEPLOYMENT_SUMMARY="${DEPLOYMENT_SUMMARY}✅ ${SERVICE_NAME}\n"
    else
        DEPLOYMENT_SUMMARY="${DEPLOYMENT_SUMMARY}❌ ${SERVICE_NAME}\n"
        FAILED_SERVICES="${FAILED_SERVICES}${SERVICE_NAME} "
    fi
done

# Print deployment summary
echo ""
echo "=========================================="
echo "         DEPLOYMENT SUMMARY"
echo "=========================================="
echo -e "$DEPLOYMENT_SUMMARY"

if [ -z "$FAILED_SERVICES" ]; then
    print_success "All services deployed successfully!"
    
    # Get gateway URL
    GATEWAY_URL=$(gcloud run services describe "clouddock-gateway" \
        --platform managed \
        --region "${REGION}" \
        --format 'value(status.url)' 2>/dev/null)
    
    if [ -n "$GATEWAY_URL" ]; then
        echo ""
        print_info "🌐 Gateway URL: ${GATEWAY_URL}"
        print_info "Update your frontend VITE_API_BASE_URL to: ${GATEWAY_URL}"
    fi
else
    print_error "Some services failed to deploy: ${FAILED_SERVICES}"
    exit 1
fi

echo ""
print_success "Deployment complete! 🚀"

