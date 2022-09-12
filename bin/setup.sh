#!/bin/bash
#install.sh

. $(dirname "$0")/meta.sh

echo
read -p "Are you sure you want to create this deployment bucket: ${DeployBucket} (Y/n)?" yn
case $yn in
  [Nn]* ) echo; echo "Okay, bucket creation aborted."; echo; exit;;
  * ) echo "Creating bucket: ${DeployBucket}"; aws s3 mb s3://${DeployBucket} --region ${REGION} --profile=${PROFILE};echo;;
esac

