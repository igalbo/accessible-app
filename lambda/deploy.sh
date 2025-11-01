#!/bin/bash

# Deployment script for axe-scanner Lambda function
# This script packages and deploys the Lambda function to AWS

set -e

echo "Starting Lambda deployment..."

# Function configuration
FUNCTION_NAME="axe-scanner"
REGION="us-east-1"
RUNTIME="nodejs20.x"
HANDLER="src/index.handler"
MEMORY_SIZE=2048
TIMEOUT=60
ROLE_NAME="lambda-axe-scanner-role"
S3_BUCKET="lambda-deploy-axe-scanner-$(aws sts get-caller-identity --query Account --output text)"
S3_KEY="axe-scanner/function.zip"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
cd "$(dirname "$0")"
npm install --production

echo -e "${YELLOW}Step 2: Creating deployment package...${NC}"
# Create a zip file with the function code and dependencies
zip -r function.zip src/ node_modules/ package.json > /dev/null

echo -e "${YELLOW}Step 3: Checking if IAM role exists...${NC}"
# Check if role exists
if ! aws iam get-role --role-name $ROLE_NAME 2>/dev/null; then
  echo "Creating IAM role..."
  
  # Create trust policy
  cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

  # Create role
  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://trust-policy.json

  # Attach basic execution policy
  aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  # Wait for role to be created
  echo "Waiting for IAM role to propagate..."
  sleep 10
  
  rm trust-policy.json
else
  echo "IAM role already exists"
fi

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
echo "Using role: $ROLE_ARN"

echo -e "${YELLOW}Step 4: Creating S3 bucket (if needed)...${NC}"
# Check if bucket exists
if ! aws s3 ls "s3://$S3_BUCKET" 2>/dev/null; then
  echo "Creating S3 bucket: $S3_BUCKET"
  aws s3 mb "s3://$S3_BUCKET" --region $REGION
else
  echo "S3 bucket already exists"
fi

echo -e "${YELLOW}Step 5: Uploading package to S3...${NC}"
aws s3 cp function.zip "s3://$S3_BUCKET/$S3_KEY"
echo "Package uploaded to s3://$S3_BUCKET/$S3_KEY"

echo -e "${YELLOW}Step 6: Creating/updating Lambda function...${NC}"
# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "Updating existing function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --s3-bucket $S3_BUCKET \
    --s3-key $S3_KEY \
    --region $REGION

  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --runtime $RUNTIME \
    --handler $HANDLER \
    --memory-size $MEMORY_SIZE \
    --timeout $TIMEOUT \
    --region $REGION
else
  echo "Creating new function..."
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime $RUNTIME \
    --role $ROLE_ARN \
    --handler $HANDLER \
    --code S3Bucket=$S3_BUCKET,S3Key=$S3_KEY \
    --timeout $TIMEOUT \
    --memory-size $MEMORY_SIZE \
    --region $REGION
fi

echo -e "${YELLOW}Step 7: Creating Function URL...${NC}"
# Create or update function URL configuration
if aws lambda get-function-url-config --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "Function URL already exists"
else
  echo "Creating Function URL..."
  aws lambda create-function-url-config \
    --function-name $FUNCTION_NAME \
    --auth-type NONE \
    --cors '{
      "AllowOrigins": ["*"],
      "AllowMethods": ["POST"],
      "AllowHeaders": ["content-type"],
      "MaxAge": 86400
    }' \
    --region $REGION

  # Add permission for public access
  aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id FunctionURLAllowPublicAccess \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE \
    --region $REGION 2>/dev/null || true
fi

# Get function URL
FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --query 'FunctionUrl' \
  --output text)

echo -e "${YELLOW}Step 8: Cleanup...${NC}"
rm function.zip

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "==================== IMPORTANT ===================="
echo "Function URL: $FUNCTION_URL"
echo ""
echo "Add this to your .env.local file:"
echo "LAMBDA_SCANNER_URL=$FUNCTION_URL"
echo "=================================================="
echo ""
echo "Test the function with:"
echo "curl -X POST $FUNCTION_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"url\":\"https://example.com\"}'"
