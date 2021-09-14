#!/bin/bash
#package.sh

. $(dirname "$0")/meta.sh
echo "Packaging artifacts to ${DeployBucket}"

sam package \
  --region ${REGION} \
  --s3-bucket ${DeployBucket} \
  --template-file .aws-sam/build/template.yaml \
  --output-template-file .aws-sam/build/template-packaged.yaml
