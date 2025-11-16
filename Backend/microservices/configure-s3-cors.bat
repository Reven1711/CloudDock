@echo off
REM Configure S3 Bucket CORS for Direct Upload
REM This allows the frontend to upload directly to S3 using presigned URLs

echo ====================================
echo S3 Bucket CORS Configuration
echo ====================================
echo.

REM Set your S3 bucket name
set BUCKET_NAME=skyvault-bucket-1
set CORS_FILE=configure-s3-cors.json

echo Bucket: %BUCKET_NAME%
echo CORS Configuration File: %CORS_FILE%
echo.

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: AWS CLI is not installed or not in PATH
    echo Please install AWS CLI: https://aws.amazon.com/cli/
    exit /b 1
)

echo AWS CLI found!
echo.

REM Check if CORS file exists
if not exist "%CORS_FILE%" (
    echo ERROR: CORS configuration file not found: %CORS_FILE%
    echo Please ensure configure-s3-cors.json exists in this directory
    exit /b 1
)

echo Applying CORS configuration to S3 bucket...
echo.

REM Apply CORS configuration
aws s3api put-bucket-cors --bucket %BUCKET_NAME% --cors-configuration file://%CORS_FILE%

if errorlevel 1 (
    echo.
    echo ERROR: Failed to apply CORS configuration
    echo.
    echo Possible reasons:
    echo - AWS credentials not configured (run: aws configure)
    echo - Insufficient permissions
    echo - Bucket does not exist
    echo - Incorrect bucket name
    echo.
    exit /b 1
)

echo.
echo ✅ SUCCESS! CORS configuration applied successfully
echo.

REM Verify CORS configuration
echo Verifying CORS configuration...
echo.
aws s3api get-bucket-cors --bucket %BUCKET_NAME%

if errorlevel 1 (
    echo WARNING: Could not verify CORS configuration
) else (
    echo.
    echo ✅ CORS configuration verified!
)

echo.
echo ====================================
echo Configuration Complete!
echo ====================================
echo.
echo Your S3 bucket now allows:
echo - PUT requests from https://clouddock-frontend.vercel.app
echo - PUT requests from http://localhost:5173 (development)
echo - Direct browser uploads using presigned URLs
echo.
echo You can now upload files up to 100MB from your frontend!
echo.

pause

