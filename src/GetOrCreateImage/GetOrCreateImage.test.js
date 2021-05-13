const GetOrCreateImage = require('./GetOrCreateImage')
const mock200Event = require('origin-response-event-http200')
const mock404Event = require('origin-response-event-http404')
const mockBadKeyEvent = require('origin-response-event-bad-key')

describe('GetOrCreateImage', () => {
  describe('when the resized image exists', ()=> {
    it('should match snapshot', async () => {
      const response = await GetOrCreateImage(mock200Event)
      expect(response).toMatchSnapshot()
    })
  })

  describe('when the resized image does not exist, but the source image does exist', ()=> {
    it('should match snapshot', async () => {
      const response = await GetOrCreateImage(mock404Event)
      expect(response).toMatchSnapshot()
    })
  })

  describe('when the source image does not exist', ()=> {
    it('should match snapshot', async () => {
      const response = await GetOrCreateImage(mockBadKeyEvent)
      expect(response).toMatchSnapshot()
    })
  })
})
