#!/bin/bash
#deploy.sh

sam deploy \
  --template-file .aws-sam/build/template-packaged.yaml \
  --stack-name $1 \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM
