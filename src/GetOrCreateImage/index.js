'use strict'

const GetOrCreateImage = require('./GetOrCreateImage')

exports.handler = async event => await GetOrCreateImage(event)
