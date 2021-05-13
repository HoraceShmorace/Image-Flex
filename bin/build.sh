#!/bin/bash
#build.sh

sam build --use-container
# docker build --tag amazonlinux:nodejs .
# docker run --rm --volume ${PWD}/src/functions/:/build amazonlinux:nodejs /bin/bash -c "source ~/.bashrc; npm install querystring --save; npm install --only=prod"
# docker run --rm --volume ${PWD}/src/functions/GetOrCreateImage:/build amazonlinux:nodejs /bin/bash -c "source ~/.bashrc; npm install sharp --save; npm install querystring --save; npm install --only=prod"
