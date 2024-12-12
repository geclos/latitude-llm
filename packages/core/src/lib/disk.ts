import { Readable } from 'stream'

import { env } from '@latitude-data/env'
import { Disk, errors } from 'flydrive'
import { FSDriver } from 'flydrive/drivers/fs'
import { S3Driver } from 'flydrive/drivers/s3'
import { SignedURLOptions, WriteOptions } from 'flydrive/types'

import { Result } from './Result'

const generateUrl =
  (baseUrl: string, publicPath: string) => async (key: string) =>
    `${baseUrl}/${publicPath}/${key}`

/**
 * These env variables are set in production.
 * If you want to test this locally, you need to set them in your machine.
 * Create a .env.development file in packages/env/.env.development and add the following:
 *
 * S3_BUCKET=[your-bucket-name]
 * PUBLIC_S3_BUCKET=[your-public-bucket-name]
 * AWS_REGION=[your-region]
 * AWS_ACCESS_KEY=[your-key]
 * AWS_ACCESS_SECRET=[your-secret]
 */
function getAwsConfig() {
  const accessKeyId = env.AWS_ACCESS_KEY
  const bucket = env.S3_BUCKET
  const publicBucket = env.PUBLIC_S3_BUCKET
  const region = env.AWS_REGION
  const secretAccessKey = env.AWS_ACCESS_SECRET

  if (!accessKeyId || !secretAccessKey || !bucket || !publicBucket || !region) {
    throw new Error(
      'AWS credentials not configured. Check you setup AWS_ACCESS_KEY, AWS_ACCESS_SECRET, (PUBLIC)_S3_BUCKET and AWS_REGION in your .env file.',
    )
  }

  return {
    region,
    bucket,
    publicBucket,
    credentials: { accessKeyId, secretAccessKey },
  }
}

async function getReadableStreamFromFile(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  return stream
}

export class DiskWrapper {
  private disk: Disk

  constructor(visibility: 'private' | 'public' = 'private') {
    this.disk = new Disk(this.buildDisk(visibility))
  }

  file(key: string) {
    return this.disk.file(key)
  }

  async getUrl(key: string) {
    return this.disk.getUrl(key)
  }

  async getSignedUrl(key: string, options?: SignedURLOptions) {
    if (this.disk.driver instanceof FSDriver) return this.disk.getUrl(key)
    return this.disk.getSignedUrl(key, options)
  }

  async putFile(key: string, file: File) {
    const contents = await getReadableStreamFromFile(file)
    return this.putStream(key, contents)
  }

  async putStream(key: string, contents: Readable, options?: WriteOptions) {
    try {
      await this.disk.putStream(key, contents, {
        ...options,
        contentLength: contents.readableLength,
      })
      return Result.nil()
    } catch (e) {
      if (e instanceof errors.E_CANNOT_WRITE_FILE) {
        return Result.error(new Error('Cannot write file'))
      }

      const error = e as Error
      return Result.error(error)
    }
  }

  async delete(key: string | null | undefined) {
    if (!key) return Result.nil()

    try {
      await this.disk.delete(key)
      return Result.nil()
    } catch (e) {
      if (e instanceof errors.E_CANNOT_DELETE_FILE) {
        return Result.error(new Error('Cannot delete file'))
      }

      const error = e as Error
      return Result.error(error)
    }
  }

  private buildDisk(visibility: 'private' | 'public') {
    const key = env.DRIVE_DISK
    const baseUrl = env.LATITUDE_URL
    const publicPath = env.FILE_PUBLIC_PATH
    const location = env.FILES_STORAGE_PATH
    const publicLocation = env.PUBLIC_FILES_STORAGE_PATH

    if (key === 'local') {
      if (!location && !publicLocation) {
        throw new Error(
          '(PUBLIC)_FILES_STORAGE_PATH env variable is required when using local disk.',
        )
      }

      if (visibility === 'public') {
        return new FSDriver({
          location: publicLocation!,
          visibility: 'public',
          urlBuilder: { generateURL: generateUrl(baseUrl!, publicPath!) },
        })
      }

      return new FSDriver({
        location: location!,
        visibility: 'private',
        urlBuilder: { generateURL: generateUrl('', publicPath!) },
      })
    }

    const awsConfig = getAwsConfig()

    if (visibility === 'public') {
      return new S3Driver({
        credentials: awsConfig.credentials,
        region: awsConfig.region,
        bucket: awsConfig.publicBucket,
        supportsACL: false,
        visibility: 'private',
      })
    }

    return new S3Driver({
      credentials: awsConfig.credentials,
      region: awsConfig.region,
      bucket: awsConfig.bucket,
      supportsACL: false,
      visibility: 'private',
    })
  }
}

export function diskFactory(visibility: 'private' | 'public' = 'private') {
  return new DiskWrapper(visibility)
}
