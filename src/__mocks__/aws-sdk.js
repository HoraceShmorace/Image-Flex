const mockImage = 'image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAJCAQAAACRI2S5AAAAEElEQVR42mNkIAAYRxWAAQAG9gAKqv6+AwAAAABJRU5ErkJggg=='
const validObjectKey = 'good-image.jpg'

exports.config = {}

exports.S3 = function () {
  return {
    getObject: jest.fn(params => {

      return {
        promise: async () => {
          if (params.Key !== validObjectKey) throw new Error()

          return {
            Body: mockImage
          }
        }
      }
    }),
    putObject: jest.fn(params => ({
      promise: async () => ({
        Payload: '{"success": true}'
      })
    }))
  }
}
