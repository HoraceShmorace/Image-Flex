const UriToS3Key = require('./UriToS3Key')
const mockEvent = require('viewer-request-event')

describe('UriToS3Key', () => {
  it('should match snapshot', async () => {
    const response = await UriToS3Key(mockEvent)
    expect(response).toMatchSnapshot()
  })
})
