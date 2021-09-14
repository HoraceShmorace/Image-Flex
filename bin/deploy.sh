#!/bin/bash
#deploy.sh

. $(dirname "$0")/meta.sh
echo "Deploying stack: ${Stackname}"
echo

sam deploy \
  --region ${REGION} \
  --stack-name ${Stackname} \
  --template-file .aws-sam/build/template-packaged.yaml \
  --capabilities CAPABILITY_IAM
