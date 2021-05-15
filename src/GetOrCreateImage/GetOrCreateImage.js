'use strict'

const AWS = require('aws-xray-sdk').captureAWS(require('aws-sdk'))
const Sharp = require('sharp')
const { parse } = require('querystring')

const S3 = new AWS.S3()

const GetOrCreateImage = async event => {
  const {
    cf: {
      request: {
        origin: {
          s3: {
            domainName
          }
        },
        querystring,
        uri
      },
      response,
      response: {
        status
      }
    }
  } = event.Records[0]
  console.log('\n* response:', JSON.stringify(response, 0, 2))
  if (status !== '404') return response

  let { nextExtension, height, sourceImage, width } = parse(querystring)
  const [bucket] = domainName.match(/.+(?=\.s3\.amazonaws\.com)/i)
  console.log('\n* bucket:', bucket)
  const contentType = 'image/' + nextExtension
  const key = uri.replace(/^\//, '')

  height = parseInt(height, 10) || null
  width = parseInt(width, 10)

  if (!width) return response

  return S3.getObject({ Bucket: bucket, Key: sourceImage })
    .promise()
    .then(imageObj => {
      let resizedImage
      const errorMessage = `Error while resizing "${sourceImage}" to "${key}":`

      // Required try/catch because Sharp.catch() doesn't seem to actually catch anything. 
      try {
        resizedImage = Sharp(imageObj.Body)
          .resize(width, height)
          .toFormat(nextExtension)
          .toBuffer()
          .catch(error => {
            throw new Error(`${errorMessage} ${error}`)
          })
      } catch(err) {
        throw new Error(`${errorMessage} ${error}`)
      }
      return resizedImage
    })
    .then(async imageBuffer => {
      await S3.putObject({
        Body: imageBuffer,
        Bucket: bucket,
        ContentType: contentType,
        Key: key,
        StorageClass: 'STANDARD'
      })
        .promise()
        .catch(error => {
          throw new Error(`Error while putting resized image '${uri}' into bucket: ${error}`)
        })

      return {
        ...response,
        status: 200,
        statusDescription: 'Found',
        body: imageBuffer.toString('base64'),
        bodyEncoding: 'base64',
        headers: {
          ...response.headers,
          'content-type': [{ key: 'Content-Type', value: contentType }]
        }
      }
    })
    .catch(error => {
      const errorMessage = `Error while getting source image object "${sourceImage}": ${error}`

      return {
        ...response,
        status: 404,
        statusDescription: 'Not Found',
        body: errorMessage,
        bodyEncoding: 'text',
        headers: {
          ...response.headers,
          'content-type': [{ key: 'Content-Type', value: 'text/plain' }]
        }
      }
    })
}

module.exports = GetOrCreateImage
