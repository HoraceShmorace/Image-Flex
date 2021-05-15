#!/bin/bash
#meta.sh

if [ "$2" != "bash" ]
  then ENV=$2
  echo "ENV argument passed. Using that value: ${2}"
elif [ $IF_ENV ]
  then ENV=$IF_ENV
  echo "IF_ENV environment variable specified. Using that value: ${IF_ENV}"
else
  ENV=dev
  echo "No env specified. Using default value: dev"
fi

Application=$1
Account=$(aws sts get-caller-identity | python3 -c "import sys, json; print(json.load(sys.stdin)['Account'])")
Stackname=${Application}-${Account}-${ENV}
DeployBucket=${Stackname}-deploy
