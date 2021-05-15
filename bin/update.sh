#!/bin/bash
#deploy.sh

npm run build
npm run package $2
npm run deploy $2
