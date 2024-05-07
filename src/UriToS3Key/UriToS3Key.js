'use strict'

const { parse } = require('querystring')

const DEFAULT_EXTENSION = 'avif'
const BAD_JPG_EXTENSION = 'jpg'
const GOOD_JPG_EXTENSION = 'jpeg'

const UriToS3Key = event => {
  const { request, request: { headers, querystring, uri } } = event.Records[0].cf
  const { h: height = '', w: width, f:format = DEFAULT_EXTENSION } = parse(querystring)

  if (!width || isNaN(parseInt(width, 10))) return request

  const [,prefix, imageName, prevExtension] = uri.match(/(.*)\/(.*)\.(\w*)/)
  const acceptHeader = Array.isArray(headers.accept)
    ? headers.accept[0].value
    : ''
  const nextExtension = acceptHeader.indexOf(format) !== -1
    ? format
    : prevExtension === BAD_JPG_EXTENSION
      ? GOOD_JPG_EXTENSION
      : prevExtension.toLowerCase()
  const dimensions = height
    ? `${width}x${height}`
    : width
  const key = `${prefix}/${dimensions}/${imageName}.${nextExtension}`

  request.uri = key
  request.querystring = [
    `nextExtension=${nextExtension}`,
    `height=${height}`,
    `sourceImage=${prefix}/${imageName}.${prevExtension}`,
    `width=${width}`
  ].join('&')

  return request
}

module.exports = UriToS3Key
