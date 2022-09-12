#!/bin/bash
#meta.sh

if [ "$2" != "bash" ] && [ "$2" != "" ]
  then ENV=$2
  echo "ENV argument passed. Using that value: ${2}"
elif [ $IF_ENV ]
  then ENV=$IF_ENV
  echo "IF_ENV environment variable specified. Using that value: ${IF_ENV}"
else
  ENV=dev
  echo "No env specified. Using default value: ${ENV}"
fi

if [ "$3" != "bash" ] && [ "$3" != "" ]
  then REGION=$3
  echo "REGION argument passed. Using that value: ${3}"
elif [ $IF_REGION ]
  then REGION=$IF_REGION
  echo "IF_REGION environment variable specified. Using that value: ${IF_REGION}"
elif [ $AWS_REGION ]
  then REGION=$AWS_REGION
  echo "AWS_REGION environment variable is set. Using that value: ${AWS_REGION}"
else
  REGION=us-east-1
  echo "No region specified. Using default value: ${REGION}"
fi

if [ "$4" != "bash" ] && [ "$4" != "" ]
  then PROFILE=$4
  echo "PROFILE argument passed. Using that value: ${4}"
else
  echo "No PROFILE specified. Using default value:}"
fi

Application=$1
Account=$(aws sts get-caller-identity --profile $4| python3 -c "import sys, json; print(json.load(sys.stdin)['Account'])")
Stackname=${Application}-${Account}-${ENV}
DeployBucket=${Stackname}-deploy
Profile=${PROFILE}
