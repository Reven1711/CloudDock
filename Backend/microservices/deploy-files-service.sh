#!/bin/bash

# Quick deployment script for files-service only
# Use this when you only need to update the files-service

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
REGISTRY="gcr.io"
SERVICE_NAME="files-service"
SERVICE_PORT="4004"

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    print_error "GCP_PROJECT_ID environment variable is not set"
    echo "Usage: GCP_PROJECT_ID=your-project-id ./deploy-files-service.sh"
    exit 1
fi

print_info "Deploying files-service to GCP Cloud Run"
print_info "Project: $PROJECT_ID"
print_info "Region: $REGION"
echo ""

# Set the active project
gcloud config set project $PROJECT_ID

# Navigate to service directory
cd files-service

# Build the Docker image
print_info "Building Docker image..."
IMAGE_NAME="${REGISTRY}/${PROJECT_ID}/clouddock-${SERVICE_NAME}:latest"

gcloud builds submit \
    --tag "${IMAGE_NAME}" \
    --quiet

if [ $? -ne 0 ]; then
    print_error "Failed to build Docker image"
    exit 1
fi

print_success "Docker image built successfully"

# Deploy to Cloud Run
print_info "Deploying to Cloud Run..."

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | tr '\n' ',' | sed 's/,$//')
    
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

if [ $? -ne 0 ]; then
    print_error "Failed to deploy files-service"
    exit 1
fi

print_success "files-service deployed successfully! 🚀"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "clouddock-${SERVICE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --format 'value(status.url)')

echo ""
print_info "Service URL: ${SERVICE_URL}"
print_success "Folder size calculation fix is now live!"

