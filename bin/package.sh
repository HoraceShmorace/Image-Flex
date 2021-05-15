#!/bin/bash
#package.sh

. $(dirname "$0")/meta.sh
echo "Packaging artifacts to ${DeployBucket}"
sam package --template-file .aws-sam/build/template.yaml --s3-bucket ${DeployBucket} --output-template-file .aws-sam/build/template-packaged.yaml
