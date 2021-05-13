#!/bin/bash
#package.sh

sam package --template-file .aws-sam/build/template.yaml --s3-bucket $1-deploy --output-template-file .aws-sam/build/template-packaged.yaml
