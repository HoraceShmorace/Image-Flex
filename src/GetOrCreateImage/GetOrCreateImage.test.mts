import { jest } from '@jest/globals'
import type { CloudFrontResponseEvent } from 'aws-lambda'
import { loadFixture } from '../__mocks__/load-fixture.mjs'

const VALID_OBJECT_KEY = 'good-image.jpg'
const MOCK_IMAGE_BYTES = new Uint8Array([1, 2, 3, 4])

jest.unstable_mockModule('@aws-sdk/client-s3', () => {
  class GetObjectCommand { constructor (public input: { Bucket: string, Key: string }) {} }
  class PutObjectCommand { constructor (public input: unknown) {} }
  class S3Client {
    send (command: GetObjectCommand | PutObjectCommand): Promise<unknown> {
      if (command instanceof GetObjectCommand) {
        if (command.input.Key !== VALID_OBJECT_KEY) {
          return Promise.reject(new Error('NoSuchKey'))
        }
        return Promise.resolve({
          Body: { transformToByteArray: async () => MOCK_IMAGE_BYTES }
        })
      }
      return Promise.resolve({})
    }
  }
  return { S3Client, GetObjectCommand, PutObjectCommand }
})

jest.unstable_mockModule('aws-xray-sdk-core', () => ({
  captureAWSv3Client: <T,>(client: T): T => client
}))

jest.unstable_mockModule('sharp', () => ({
  default: () => ({
    resize: () => ({
      toFormat: () => ({
        toBuffer: async () => Buffer.from('resized-image-bytes')
      })
    })
  })
}))

const { GetOrCreateImage } = await import('./GetOrCreateImage.mjs')

const mock200Event = loadFixture<CloudFrontResponseEvent>('origin-response-event-http200.json')
const mock403Event = loadFixture<CloudFrontResponseEvent>('origin-response-event-http403.json')
const mock404Event = loadFixture<CloudFrontResponseEvent>('origin-response-event-http404.json')
const mockBadKeyEvent = loadFixture<CloudFrontResponseEvent>('origin-response-event-bad-key.json')

describe('GetOrCreateImage', () => {
  it('passes the response through when status is 200', async () => {
    const response = await GetOrCreateImage(mock200Event)
    expect(response).toMatchSnapshot()
  })

  it('resizes the source and returns the new image when status is 403', async () => {
    const response = await GetOrCreateImage(mock403Event)
    expect(response).toMatchSnapshot()
  })

  it('resizes the source and returns the new image when status is 404', async () => {
    const response = await GetOrCreateImage(mock404Event)
    expect(response).toMatchSnapshot()
  })

  it('returns a 404 when the source image cannot be fetched', async () => {
    const response = await GetOrCreateImage(mockBadKeyEvent)
    expect(response).toMatchSnapshot()
  })
})
