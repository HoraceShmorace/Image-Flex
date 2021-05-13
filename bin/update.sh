#!/bin/bash
#deploy.sh

npm run build
npm run package -- $1
npm run deploy -- $1
