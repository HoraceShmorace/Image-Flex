import type {
  CloudFrontResponseEvent,
  CloudFrontResponse,
  CloudFrontResultResponse
} from 'aws-lambda'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { captureAWSv3Client } from 'aws-xray-sdk-core'
import sharp from 'sharp'

// Lambda@Edge replicas run in the region nearest the viewer, but the bucket
// lives in the stack's region — SDK v3 does not follow S3 region redirects,
// so the client must be pinned to the origin's region from the event.
const clientsByRegion = new Map<string, S3Client>()
const s3ForRegion = (region: string): S3Client => {
  let client = clientsByRegion.get(region)
  if (!client) {
    client = captureAWSv3Client(new S3Client({ region }))
    clientsByRegion.set(region, client)
  }
  return client
}

export const GetOrCreateImage = async (
  event: CloudFrontResponseEvent
): Promise<CloudFrontResponse | CloudFrontResultResponse> => {
  const { request, response } = event.Records[0].cf
  const { origin, querystring, uri } = request

  if (!['403', '404'].includes(response.status)) return response

  const s3Origin = origin?.s3
  if (!s3Origin) return response

  const params = new URLSearchParams(querystring)
  const nextExtension = params.get('nextExtension') ?? ''
  const sourceImage = params.get('sourceImage') ?? ''
  const width = parseInt(params.get('w') ?? params.get('width') ?? '', 10)
  const height = parseInt(params.get('h') ?? params.get('height') ?? '', 10) || null

  if (!width || !nextExtension || !sourceImage) return response

  const bucketMatch = s3Origin.domainName.match(/.+(?=\.s3\.amazonaws\.com)/i)
  if (!bucketMatch) return response
  const bucket = bucketMatch[0]
  const contentType = `image/${nextExtension}`
  const key = uri.replace(/^\//, '')
  const sourceKey = sourceImage.replace(/^\//, '')
  const S3 = s3ForRegion(s3Origin.region || 'us-east-1')

  try {
    const sourceObject = await S3.send(
      new GetObjectCommand({ Bucket: bucket, Key: sourceKey })
    )
    if (!sourceObject.Body) throw new Error('Empty source body')

    const sourceBytes = await sourceObject.Body.transformToByteArray()

    const resizedImage = await sharp(Buffer.from(sourceBytes))
      .resize(width, height)
      .toFormat(nextExtension as keyof sharp.FormatEnum, { quality: 95 })
      .toBuffer()

    await S3.send(
      new PutObjectCommand({
        Body: resizedImage,
        Bucket: bucket,
        ContentType: contentType,
        Key: key,
        StorageClass: 'STANDARD'
      })
    )

    return {
      ...response,
      status: '200',
      statusDescription: 'Found',
      body: resizedImage.toString('base64'),
      bodyEncoding: 'base64',
      headers: {
        ...response.headers,
        'content-type': [{ key: 'Content-Type', value: contentType }]
      }
    }
  } catch (error) {
    return {
      ...response,
      status: '404',
      statusDescription: 'Not Found',
      body: `Error while getting source image object "${sourceKey}": ${error}`,
      bodyEncoding: 'text',
      headers: {
        ...response.headers,
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }]
      }
    }
  }
}
