import type { CloudFrontRequestEvent } from 'aws-lambda'
import { UriToS3Key } from './UriToS3Key.mjs'
import { loadFixture } from '../__mocks__/load-fixture.mjs'

const viewerRequestEvent = loadFixture<CloudFrontRequestEvent>('viewer-request-event.json')

describe('UriToS3Key', () => {
  it('rewrites the request URI and querystring to match snapshot', () => {
    const response = UriToS3Key(viewerRequestEvent)
    expect(response).toMatchSnapshot()
  })
})
