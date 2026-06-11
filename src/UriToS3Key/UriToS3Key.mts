import type { CloudFrontRequestEvent, CloudFrontRequest } from 'aws-lambda'

const DEFAULT_EXTENSION = 'avif'
const BAD_JPG_EXTENSION = 'jpg'
const GOOD_JPG_EXTENSION = 'jpeg'

export const UriToS3Key = (event: CloudFrontRequestEvent): CloudFrontRequest => {
  const { request } = event.Records[0].cf
  const { headers, querystring, uri } = request
  const params = new URLSearchParams(querystring)
  const width = params.get('w') ?? ''
  const height = params.get('h') ?? ''
  const format = params.get('f') ?? DEFAULT_EXTENSION

  if (!width || isNaN(parseInt(width, 10))) return request

  const match = uri.match(/(.*)\/(.*)\.(\w*)/)
  if (!match) return request
  const [, prefix, imageName, prevExtension] = match

  const acceptHeader = headers.accept?.[0]?.value ?? ''
  const nextExtension = acceptHeader.indexOf(format) !== -1
    ? format
    : prevExtension === BAD_JPG_EXTENSION
      ? GOOD_JPG_EXTENSION
      : prevExtension.toLowerCase()
  const dimensions = height ? `${width}x${height}` : width
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
