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

export interface S3ClientLike {
  send(command: any): Promise<any>
}

export class S3Storage implements IStorage {
  private readonly opts: S3StorageOptions
  // SDK handles are cached after first lazy import. Typed as S3ClientLike to keep
  // this module resilient when @aws-sdk is not installed or when types differ.
  private _mod: any = null
  private _client: S3ClientLike | null = null

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

  private async client(): Promise<S3ClientLike> {
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
      }) as S3ClientLike
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
    file: File | Blob | ArrayBuffer,
    options?: UploadOptions
  ): Promise<StorageResult<string>> {
    try {
      const { PutObjectCommand } = await this.mod()
      const client = await this.client()
      const body = file instanceof ArrayBuffer ? new Uint8Array(file) : file
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: path,
          Body: body as Uint8Array | Blob,
          ContentType: options?.contentType,
          CacheControl: options?.cacheControl,
          Metadata: options?.metadata,
          ACL: options?.acl,
        })
      )
      return { data: this.getPublicUrl(bucket, path), error: null }
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
      const body = res.Body as { transformToByteArray: () => Promise<Uint8Array> } | undefined
      if (!body) {
        return { data: null, error: new Error(`Empty body for ${path}`) }
      }
      const bytes = (await body.transformToByteArray()) as Uint8Array<ArrayBuffer>
      return { data: new Blob([bytes], { type: res.ContentType }), error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async delete(bucket: string, path: string): Promise<StorageResult<boolean>> {
    try {
      const { DeleteObjectCommand } = await this.mod()
      const client = await this.client()
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }))
      return { data: true, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async deleteMany(bucket: string, paths: string[]): Promise<StorageResult<boolean>> {
    try {
      const { DeleteObjectsCommand } = await this.mod()
      const client = await this.client()
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: paths.map((Key) => ({ Key })) },
        })
      )
      return { data: true, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async exists(bucket: string, path: string): Promise<StorageResult<boolean>> {
    try {
      const { HeadObjectCommand } = await this.mod()
      const client = await this.client()
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: path }))
      return { data: true, error: null }
    } catch (err) {
      const name = (err as { name?: string })?.name
      if (name === 'NotFound' || name === 'NoSuchKey') {
        return { data: false, error: null }
      }
      return { data: false, error: toError(err) }
    }
  }

  async getMetadata(bucket: string, path: string): Promise<StorageResult<StorageFile>> {
    try {
      const { HeadObjectCommand } = await this.mod()
      const client = await this.client()
      const res = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: path }))
      return {
        data: {
          name: path.split('/').pop() ?? path,
          path,
          size: res.ContentLength ?? 0,
          contentType: res.ContentType,
          lastModified: res.LastModified,
          metadata: res.Metadata,
          publicUrl: this.getPublicUrl(bucket, path),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  async list(bucket: string, options?: ListOptions): Promise<StorageListResult> {
    try {
      const { ListObjectsV2Command } = await this.mod()
      const client = await this.client()
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: options?.prefix,
          MaxKeys: options?.limit,
        })
      )
      const contents = res.Contents ?? []
      const offset = options?.offset ?? 0
      const files: StorageFile[] = contents.slice(offset).map((obj: { Key?: string; Size?: number; LastModified?: Date }) => ({
        name: (obj.Key ?? '').split('/').pop() ?? (obj.Key ?? ''),
        path: obj.Key ?? '',
        size: obj.Size ?? 0,
        lastModified: obj.LastModified,
        publicUrl: this.getPublicUrl(bucket, obj.Key ?? ''),
      }))
      return { data: files, error: null, count: files.length }
    } catch (err) {
      return { data: null, error: toError(err), count: null }
    }
  }

  async move(
    bucket: string,
    fromPath: string,
    toPath: string
  ): Promise<StorageResult<boolean>> {
    const { data: copied, error } = await this.copy(bucket, fromPath, bucket, toPath)
    if (error || !copied) {
      return { data: null, error: error ?? new Error('Copy failed during move') }
    }
    return this.delete(bucket, fromPath)
  }

  async copy(
    sourceBucket: string,
    sourcePath: string,
    destBucket: string,
    destPath: string
  ): Promise<StorageResult<boolean>> {
    try {
      const { CopyObjectCommand } = await this.mod()
      const client = await this.client()
      await client.send(
        new CopyObjectCommand({
          Bucket: destBucket,
          Key: destPath,
          CopySource: encodeURI(`${sourceBucket}/${sourcePath}`),
        })
      )
      return { data: true, error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  // -------------------------------------------------------------------------
  // URL OPERATIONS
  // -------------------------------------------------------------------------

  getPublicUrl(bucket: string, path: string): string {
    const key = path.split('/').map(encodeURIComponent).join('/')
    if (this.opts.publicBaseUrl) {
      return `${this.opts.publicBaseUrl.replace(/\/$/, '')}/${key}`
    }
    if (this.opts.endpoint) {
      return `${this.opts.endpoint.replace(/\/$/, '')}/${bucket}/${key}`
    }
    return `https://${bucket}.s3.${this.opts.region}.amazonaws.com/${key}`
  }

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

  async createSignedUrls(
    bucket: string,
    paths: string[],
    options?: SignedUrlOptions
  ): Promise<StorageResult<string[]>> {
    try {
      const results = await Promise.all(
        paths.map((p) => this.createSignedUrl(bucket, p, options))
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) {
        return { data: null, error: failed.error }
      }
      return { data: results.map((r) => r.data as string), error: null }
    } catch (err) {
      return { data: null, error: toError(err) }
    }
  }

  // -------------------------------------------------------------------------
  // ADVANCED OPERATIONS
  // -------------------------------------------------------------------------

  async uploadWithProgress(
    bucket: string,
    path: string,
    file: File | Blob,
    onProgress: (progress: number) => void,
    options?: UploadOptions
  ): Promise<{ url: string | null; error: Error | null; abort: () => void }> {
    // The S3 SDK does not surface granular upload progress for a single
    // PutObject; we report 0 → 100 around the call. For true progress, use
    // createPresignedPost + an XHR client-side.
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
