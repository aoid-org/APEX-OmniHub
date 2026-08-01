/**
 * S3 STORAGE PROVIDER (S3-compatible)
 *
 * Implementation of IStorage for AWS S3 and any S3-compatible service
 * (Cloudflare R2, MinIO, GCS S3-interop) via the `endpoint` option.
 *
 * SECURITY — SERVER / EDGE ONLY:
 * This provider requires real AWS credentials (accessKeyId/secretAccessKey).
 * It MUST NOT be constructed in browser code, because that would ship the
 * secret key in the client bundle (full bucket access for anyone). The storage
 * factory's browser path (getStorage) refuses to build it. For browser uploads,
 * mint a presigned URL server-side (createSignedUrl / createPresignedPost) and
 * hand only that to the client.
 *
 * The AWS SDK is imported lazily (dynamic import) so selecting Supabase never
 * pulls @aws-sdk/client-s3 into the bundle.
 */

import type {
  IStorage,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  StorageFile,
  StorageResult,
  StorageListResult,
  SignedUrlOptions,
} from '../interface'

export interface S3StorageOptions {
  region?: string
  accessKeyId: string
  secretAccessKey: string
  /** For S3-compatible services (R2, MinIO). Omit for AWS S3. */
  endpoint?: string
  /** Required for R2/MinIO; AWS S3 uses virtual-hosted style by default. */
  forcePathStyle?: boolean
  /** Optional CDN/public base (e.g. CloudFront or R2 public domain) for getPublicUrl. */
  publicBaseUrl?: string
  debug?: boolean
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

export class S3Storage implements IStorage {
  private readonly opts: S3StorageOptions
  // SDK handles are cached after first lazy import. Typed as any to keep
  // this module resilient when @aws-sdk is not installed or when types differ.
  private _mod: any = null
  private _client: any = null

  constructor(options: S3StorageOptions) {
    if (!options.accessKeyId || !options.secretAccessKey) {
      throw new Error('S3Storage requires accessKeyId and secretAccessKey')
    }
    if (!options.region && !options.endpoint) {
      throw new Error('S3Storage requires either region (AWS) or endpoint (R2/MinIO)')
    }
    this.opts = options
  }

  private async mod(): Promise<any> {
    this._mod ??= await import('@aws-sdk/client-s3')
    return this._mod
  }

  private async client(): Promise<any> {
    if (!this._client) {
      const { S3Client } = await this.mod()
      this._client = new S3Client({
        region: this.opts.region ?? 'auto',
        endpoint: this.opts.endpoint,
        forcePathStyle: this.opts.forcePathStyle ?? Boolean(this.opts.endpoint),
        credentials: {
          accessKeyId: this.opts.accessKeyId,
          secretAccessKey: this.opts.secretAccessKey,
        },
      })
    }
    return this._client
  }

  // -------------------------------------------------------------------------
  // BUCKET OPERATIONS
  // -------------------------------------------------------------------------

  async createBucket(name: string): Promise<StorageResult<boolean>> {
    try {
      const { CreateBucketCommand } = await this.mod()
      const client = await this.client()
      await client.send(new CreateBucketCommand({ Bucket: name }))
      return { data: true, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async deleteBucket(name: string): Promise<StorageResult<boolean>> {
    try {
      const { DeleteBucketCommand } = await this.mod()
      const client = await this.client()
      await client.send(new DeleteBucketCommand({ Bucket: name }))
      return { data: true, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async listBuckets(): Promise<StorageResult<string[]>> {
    try {
      const { ListBucketsCommand } = await this.mod()
      const client = await this.client()
      const res = await client.send(new ListBucketsCommand({}))
      return { data: (res.Buckets ?? []).map((b: { Name?: string }) => b.Name ?? ''), error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  // -------------------------------------------------------------------------
  // FILE OPERATIONS
  // -------------------------------------------------------------------------

  async upload(
    bucket: string,
    path: string,
    file: Blob | File | ArrayBuffer | Uint8Array | string,
    options?: UploadOptions
  ): Promise<StorageResult<string>> {
    try {
      const { PutObjectCommand } = await this.mod()
      const client = await this.client()
      let body: any = file
      if (typeof file === 'string') {
        body = new TextEncoder().encode(file)
      }
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: path,
          Body: body,
          ContentType: options?.contentType,
          CacheControl: options?.cacheControl,
          Metadata: options?.metadata,
        })
      )
      return { data: await this.getPublicUrl(bucket, path), error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async download(
    bucket: string,
    path: string,
    _options?: DownloadOptions
  ): Promise<StorageResult<Blob>> {
    try {
      const { GetObjectCommand } = await this.mod()
      const client = await this.client()
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: path }))
      if (!res.Body) {
        throw new Error('S3 GetObject returned empty body')
      }
      // transformToByteArray is standard on AWS SDK v3 stream responses
      const bytes = await res.Body.transformToByteArray()
      const blob = new Blob([bytes], { type: res.ContentType ?? 'application/octet-stream' })
      return { data: blob, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async delete(bucket: string, paths: string[]): Promise<StorageResult<boolean>> {
    try {
      const { DeleteObjectsCommand } = await this.mod()
      const client = await this.client()
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: paths.map((p) => ({ Key: p })),
            Quiet: true,
          },
        })
      )
      return { data: true, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async list(bucket: string, path?: string, options?: ListOptions): Promise<StorageListResult> {
    try {
      const { ListObjectsV2Command } = await this.mod()
      const client = await this.client()
      const prefix = path ? path.replace(/\/$/, '') + '/' : undefined
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: options?.limit ?? 100,
          ContinuationToken: options?.cursor,
        })
      )

      const files: StorageFile[] = (res.Contents ?? []).map((item: any) => ({
        id: item.Key ?? '',
        name: item.Key ? item.Key.split('/').pop() ?? item.Key : '',
        path: item.Key ?? '',
        size: item.Size ?? 0,
        mimeType: 'application/octet-stream',
        createdAt: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
        updatedAt: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
        metadata: { etag: item.ETag },
      }))

      return {
        data: files,
        nextCursor: res.NextContinuationToken ?? null,
        error: null,
      }
    } catch (err) {
      return { data: [], nextCursor: null, error: toError(err) }
    }
  }

  async exists(bucket: string, path: string): Promise<StorageResult<boolean>> {
    try {
      const { HeadObjectCommand } = await this.mod()
      const client = await this.client()
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: path }))
      return { data: true, error: null }
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { data: false, error: null }
      }
      return { data: null, error: toError(err) }
    }
  }

  async copy(
    sourceBucket: string,
    sourcePath: string,
    destinationBucket: string,
    destinationPath: string
  ): Promise<StorageResult<boolean>> {
    try {
      const { CopyObjectCommand } = await this.mod()
      const client = await this.client()
      await client.send(
        new CopyObjectCommand({
          Bucket: destinationBucket,
          Key: destinationPath,
          CopySource: encodeURIComponent(`${sourceBucket}/${sourcePath}`),
        })
      )
      return { data: true, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async move(
    sourceBucket: string,
    sourcePath: string,
    destinationBucket: string,
    destinationPath: string
  ): Promise<StorageResult<boolean>> {
    const copyRes = await this.copy(sourceBucket, sourcePath, destinationBucket, destinationPath)
    if (copyRes.error) return copyRes
    const delRes = await this.delete(sourceBucket, [sourcePath])
    if (delRes.error) return delRes
    return { data: true, error: null }
  }

  // -------------------------------------------------------------------------
  // PRESIGNED URLS
  // -------------------------------------------------------------------------

  async createSignedUrl(
    bucket: string,
    path: string,
    options?: SignedUrlOptions
  ): Promise<StorageResult<string>> {
    try {
      const { GetObjectCommand } = await this.mod()
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
      const client = await this.client()
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: path }),
        { expiresIn: options?.expiresIn ?? 3600 }
      )
      return { data: url, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async getPublicUrl(bucket: string, path: string): Promise<string> {
    const key = path.split('/').map(encodeURIComponent).join('/')
    if (this.opts.publicBaseUrl) {
      return `${this.opts.publicBaseUrl.replace(/\/$/, '')}/${key}`
    }
    if (this.opts.endpoint) {
      return `${this.opts.endpoint.replace(/\/$/, '')}/${bucket}/${key}`
    }
    return `https://${bucket}.s3.${this.opts.region ?? 'us-east-1'}.amazonaws.com/${key}`
  }

  async createSignedUrls(
    bucket: string,
    paths: string[],
    options?: SignedUrlOptions
  ): Promise<StorageResult<Record<string, string>>> {
    try {
      const out: Record<string, string> = {}
      for (const p of paths) {
        const res = await this.createSignedUrl(bucket, p, options)
        if (res.error || !res.data) return { data: null, error: res.error ?? new Error(`Failed url for ${p}`) }
        out[p] = res.data
      }
      return { data: out, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  // -------------------------------------------------------------------------
  // ADVANCED OPERATIONS
  // -------------------------------------------------------------------------

  async uploadResumable(
    bucket: string,
    path: string,
    file: Blob | File,
    onProgress: (progress: number) => void,
    options?: UploadOptions
  ): Promise<{ url: string | null; error: Error | null; abort: () => void }> {
    const controller = new AbortController()
    onProgress(0)
    const { data: url, error } = await this.upload(bucket, path, file, options)
    if (!error) onProgress(100)
    return { url, error, abort: () => controller.abort() }
  }

  async createPresignedPost(
    bucket: string,
    path: string,
    options?: UploadOptions & { expiresIn?: number }
  ): Promise<StorageResult<{ url: string; fields: Record<string, string> }>> {
    try {
      const { createPresignedPost } = await import('@aws-sdk/s3-presigned-post')
      const client = await this.client()
      const res = await createPresignedPost(client, {
        Bucket: bucket,
        Key: path,
        Fields: options?.contentType ? { 'Content-Type': options.contentType } : undefined,
        Expires: options?.expiresIn ?? 3600,
      })
      return { data: { url: res.url, fields: res.fields }, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  // -------------------------------------------------------------------------
  // HEALTH CHECK
  // -------------------------------------------------------------------------

  async ping(): Promise<boolean> {
    try {
      const { ListBucketsCommand } = await this.mod()
      const client = await this.client()
      await client.send(new ListBucketsCommand({}))
      return true
    } catch (err) {
      if (this.opts.debug) console.error('[S3Storage] Ping failed:', err)
      return false
    }
  }
}
