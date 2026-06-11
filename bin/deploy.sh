#!/bin/bash
#deploy.sh

. $(dirname "$0")/meta.sh
echo "Deploying stack: ${Stackname}"
echo

sam deploy \
  --region ${REGION} \
  --stack-name ${Stackname} \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset
