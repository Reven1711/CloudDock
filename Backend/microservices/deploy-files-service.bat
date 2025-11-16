@echo off
REM Quick deployment script for files-service only (Windows)
REM Use this when you only need to update the files-service

setlocal enabledelayedexpansion

REM Configuration
set "REGION=us-central1"
set "REGISTRY=gcr.io"
set "SERVICE_NAME=files-service"
set "SERVICE_PORT=4004"

REM Check if GCP_PROJECT_ID is set
if "%GCP_PROJECT_ID%"=="" (
    echo ERROR: GCP_PROJECT_ID environment variable is not set
    echo Usage: set GCP_PROJECT_ID=your-project-id ^&^& deploy-files-service.bat
    exit /b 1
)

set "PROJECT_ID=%GCP_PROJECT_ID%"

echo ========================================
echo   Deploying files-service to Cloud Run
echo ========================================
echo Project: %PROJECT_ID%
echo Region: %REGION%
echo.

REM Set the active project
echo Setting GCP project...
gcloud config set project %PROJECT_ID%

REM Navigate to service directory
cd files-service

REM Build the Docker image
echo.
echo Building Docker image...
set "IMAGE_NAME=%REGISTRY%/%PROJECT_ID%/clouddock-%SERVICE_NAME%:latest"

gcloud builds submit --tag "%IMAGE_NAME%" --quiet

if errorlevel 1 (
    echo ERROR: Failed to build Docker image
    exit /b 1
)

echo SUCCESS: Docker image built successfully
echo.

REM Deploy to Cloud Run
echo Deploying to Cloud Run...

gcloud run deploy "clouddock-%SERVICE_NAME%" ^
    --image "%IMAGE_NAME%" ^
    --platform managed ^
    --region "%REGION%" ^
    --port %SERVICE_PORT% ^
    --allow-unauthenticated ^
    --memory 512Mi ^
    --cpu 1 ^
    --min-instances 0 ^
    --max-instances 10 ^
    --timeout 300 ^
    --quiet

if errorlevel 1 (
    echo ERROR: Failed to deploy files-service
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS: Deployment Complete! 🚀
echo ========================================
echo.

REM Get the service URL
echo Getting service URL...
gcloud run services describe "clouddock-%SERVICE_NAME%" ^
    --platform managed ^
    --region "%REGION%" ^
    --format "value(status.url)"

echo.
echo Folder size calculation fix is now live!

