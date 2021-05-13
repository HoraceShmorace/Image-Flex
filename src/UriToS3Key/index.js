'use strict'

const UriToS3Key = require('./UriToS3Key')

exports.handler = async event => await UriToS3Key(event)
