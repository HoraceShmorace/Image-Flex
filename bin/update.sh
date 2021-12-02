#!/bin/bash
#deploy.sh

npm run build
npm run package $2 $3
npm run deploy $2 $3
