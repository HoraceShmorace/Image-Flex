#!/bin/bash
#deploy.sh

. $(dirname "$0")/meta.sh
echo "Deploying stack: ${Stackname}"
echo

sam deploy \
  --template-file .aws-sam/build/template-packaged.yaml \
  --stack-name ${Stackname} \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM
