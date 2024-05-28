#!/bin/zsh

# Define variables
STACK_NAME="HelloClientSampleStack"
LOCAL_DIR="s3"

# Get S3 bucket name and CloudFront distribution ID from CloudFormation stack outputs
STACK_OUTPUT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME)

S3_BUCKET=$(echo $STACK_OUTPUT | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "BucketName") | .OutputValue')
CLOUDFRONT_DIST_ID=$(echo $STACK_OUTPUT | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "DistributionId") | .OutputValue')

# Check if both S3 bucket and CloudFront distribution ID were retrieved successfully
if [[ -z "$S3_BUCKET" || -z "$CLOUDFRONT_DIST_ID" ]]; then
  echo "Failed to retrieve S3 bucket name or CloudFront distribution ID from CloudFormation stack outputs."
  exit 1
fi

# Copy contents to the S3 bucket
echo "Copying contents of $LOCAL_DIR to s3://$S3_BUCKET"
aws s3 sync $LOCAL_DIR s3://$S3_BUCKET

# Create an invalidation for the CloudFront distribution
echo "Creating CloudFront invalidation"
INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths "/*" | jq -r '.Invalidation.Id')

# Check if the invalidation was created successfully
if [[ -z "$INVALIDATION_ID" ]]; then
  echo "Failed to create CloudFront invalidation."
  exit 1
fi

echo "CloudFront invalidation created with ID: $INVALIDATION_ID"