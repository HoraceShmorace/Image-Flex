import type { CloudFrontRequestHandler } from 'aws-lambda'
import { UriToS3Key } from './UriToS3Key.mjs'

export const handler: CloudFrontRequestHandler = async (event) => UriToS3Key(event)
