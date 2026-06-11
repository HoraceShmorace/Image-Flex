import type { CloudFrontResponseHandler } from 'aws-lambda'
import { GetOrCreateImage } from './GetOrCreateImage.mjs'

export const handler: CloudFrontResponseHandler = async (event) => GetOrCreateImage(event)
