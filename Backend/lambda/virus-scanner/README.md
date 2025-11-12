# Virus Scanner Lambda Function

AWS Lambda function that scans uploaded files for viruses using ClamAV.

## Overview

This Lambda function is triggered after files are uploaded to S3. It downloads the file, scans it with ClamAV, and reports the result back to the backend API.

## Prerequisites

- AWS Lambda with at least 512MB memory
- Lambda layer with ClamAV installed
- IAM role with S3 read permissions
- Node.js 18+ runtime

## Environment Variables

- `AWS_REGION`: AWS region (default: us-east-1)
- `CALLBACK_URL`: Backend API URL to send scan results
  - Example: `https://api.clouddock.com/files/virus-scan-callback`
- `S3_BUCKET_NAME`: Name of the S3 bucket

## Setup Instructions

### 1. Create ClamAV Lambda Layer

```bash
# Create a Lambda layer with ClamAV
# Use pre-built layer or build your own
# Layer ARN example: arn:aws:lambda:us-east-1:123456789:layer:clamav:1
```

### 2. Create Lambda Function

```bash
# Create function via AWS Console or CLI
aws lambda create-function \
  --function-name clouddock-virus-scanner \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-s3-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 300 \
  --memory-size 1024
```

### 3. Add Environment Variables

```bash
aws lambda update-function-configuration \
  --function-name clouddock-virus-scanner \
  --environment Variables="{
    CALLBACK_URL=https://your-api.com/files/virus-scan-callback,
    AWS_REGION=us-east-1
  }"
```

### 4. Attach ClamAV Layer

```bash
aws lambda update-function-configuration \
  --function-name clouddock-virus-scanner \
  --layers arn:aws:lambda:us-east-1:123456789:layer:clamav:1
```

### 5. Grant S3 Permissions

Add this policy to the Lambda execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:GetObjectVersion"],
      "Resource": "arn:aws:s3:::clouddock-storage/*"
    }
  ]
}
```

## Deployment

### Option 1: AWS Console

1. Zip the index.mjs file
2. Upload to Lambda via console
3. Configure environment variables
4. Test with sample event

### Option 2: AWS CLI

```bash
# Package the function
zip function.zip index.mjs

# Update function code
aws lambda update-function-code \
  --function-name clouddock-virus-scanner \
  --zip-file fileb://function.zip
```

### Option 3: AWS SAM/CloudFormation

```yaml
# template.yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Resources:
  VirusScannerFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: clouddock-virus-scanner
      CodeUri: ./
      Handler: index.handler
      Runtime: nodejs18.x
      Timeout: 300
      MemorySize: 1024
      Environment:
        Variables:
          CALLBACK_URL: !Ref CallbackUrl
      Layers:
        - !Ref ClamAVLayer
      Policies:
        - S3ReadPolicy:
            BucketName: clouddock-storage
```

## Testing

### Test Event

```json
{
  "s3Key": "test-org/test-user/123456-file.pdf",
  "fileId": "uuid-here",
  "bucket": "clouddock-storage"
}
```

### Local Testing

```bash
# Install dependencies
npm install @aws-sdk/client-s3

# Set environment variables
export AWS_REGION=us-east-1
export CALLBACK_URL=http://localhost:4000/files/virus-scan-callback
export S3_BUCKET_NAME=clouddock-storage

# Run locally (requires ClamAV installed)
node test-local.mjs
```

## Monitoring

- CloudWatch Logs: `/aws/lambda/clouddock-virus-scanner`
- CloudWatch Metrics: Duration, Errors, Invocations
- X-Ray Tracing: Enable for detailed performance analysis

## Cost Optimization

- Use Lambda layers to reduce package size
- Optimize memory allocation (test with 512MB, 1024MB, 2048MB)
- Use provisioned concurrency for consistent performance
- Monitor and adjust timeout settings

## Troubleshooting

### Common Issues

**1. ClamAV not found**

- Ensure ClamAV layer is attached
- Check layer compatibility with runtime

**2. Timeout errors**

- Increase Lambda timeout (max 900s)
- Increase memory allocation

**3. Out of memory**

- Increase memory to at least 1024MB
- Large files may need 2048MB or more

**4. S3 access denied**

- Verify IAM role has S3 read permissions
- Check bucket policy

## Security

- Lambda runs in VPC if needed
- Use KMS encryption for sensitive data
- Rotate IAM credentials regularly
- Enable CloudWatch Logs encryption

## Maintenance

- Update ClamAV signatures regularly via layer updates
- Monitor Lambda performance metrics
- Review and optimize cold start times
- Keep Node.js runtime updated
