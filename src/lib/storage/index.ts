/**
 * STORAGE ABSTRACTION LAYER - FACTORY
 *
 * Purpose: Create storage instances with provider abstraction
 * Usage:
 *   import { createStorage, storage } from '@/lib/storage'
 *
 *   // Option 1: Use singleton instance (recommended)
 *   const { data: url } = await storage.upload('avatars', 'profile.jpg', file)
 *
 *   // Option 2: Create custom instance
 *   const s3Storage = createStorage({ provider: 's3', region: 'us-east-1', ... })
 */

import type { IStorage, StorageFactoryOptions } from './interface'
import { SupabaseStorage } from './providers/supabase'
import { S3Storage } from './providers/s3'

// Providers that require server-side secrets and must NEVER be wired from
// browser/client environment variables — doing so would ship the secret key in
// the bundle. createStorage() allows them (intended for server/edge context);
// the browser singleton getStorage() refuses them.
const SERVER_ONLY_PROVIDERS = new Set<StorageFactoryOptions['provider']>([
  's3',
  'r2',
  'gcs',
  'azure',
])

// ============================================================================
// STORAGE FACTORY
// ============================================================================

/**
 * Create a storage instance based on provider.
 *
 * NOTE: 's3'/'r2' require AWS-style credentials and are intended for
 * server/edge usage. Never call this with secrets in browser code — use
 * getStorage() there, which is Supabase-only, and mint presigned URLs
 * server-side for browser uploads/downloads.
 */
export function createStorage(options: StorageFactoryOptions): IStorage {
  switch (options.provider) {
    case 'supabase':
      if (!options.url || !options.apiKey) {
        throw new Error(
          'Supabase provider requires "url" and "apiKey" options'
        )
      }

      return new SupabaseStorage({
        url: options.url,
        apiKey: options.apiKey,
        serviceRoleKey: options.serviceRoleKey,
        debug: options.debug,
      })

    // S3-compatible: AWS S3, and (via endpoint) Cloudflare R2 / MinIO.
    case 's3':
    case 'r2':
      if (!options.accessKeyId || !options.secretAccessKey) {
        throw new Error(
          `Storage provider "${options.provider}" requires accessKeyId and secretAccessKey (server-side only).`
        )
      }
      return new S3Storage({
        region: options.region,
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        endpoint: options.endpoint,
        debug: options.debug,
      })

    case 'gcs':
    case 'azure':
      throw new Error(`Storage provider "${options.provider}" is not yet implemented. Set VITE_STORAGE_PROVIDER=supabase or remove the env var to use the default.`)

    default:
      throw new Error(`Unknown storage provider: ${options.provider}`)
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default storage instance (Supabase Storage)
 * Configured from environment variables
 */
let _storage: IStorage | null = null

export function getStorage(): IStorage {
  if (_storage) {
    return _storage
  }

  // Read from environment variables
  const provider = (import.meta.env.VITE_STORAGE_PROVIDER ||
    'supabase') as StorageFactoryOptions['provider']

  // SECURITY: the browser singleton is Supabase-only. S3/R2/GCS/Azure need
  // secret credentials that must not be exposed client-side. To use them,
  // construct via createStorage() in a server/edge context and mint presigned
  // URLs for the browser.
  if (SERVER_ONLY_PROVIDERS.has(provider)) {
    throw new Error(
      `VITE_STORAGE_PROVIDER="${provider}" cannot be used in the browser: it would ` +
        `embed secret credentials in the client bundle. Use 'supabase' here, and ` +
        `construct the ${provider} provider server-side via createStorage() with presigned URLs.`
    )
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const apiKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY
  // SECURITY: Never use serviceRoleKey in client code - it bypasses RLS!
  // Only use anon/publishable keys in browser. Service role is for Edge Functions only.
  const debug = import.meta.env.DEV

  if (!url || !apiKey) {
    throw new Error(
      'Storage not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables.'
    )
  }

  _storage = createStorage({
    provider,
    url,
    apiKey,
    // serviceRoleKey omitted - client code uses anon key with RLS protection
    debug,
  })

  return _storage
}

/**
 * Singleton storage instance
 * Lazy-loaded on first access
 */
export const storage = new Proxy({} as IStorage, {
  get(_target, prop) {
    const instance = getStorage()
    return (instance as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type {
  IStorage,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  StorageFile,
  StorageResult,
  StorageListResult,
  SignedUrlOptions,
  StorageProvider,
  StorageFactoryOptions,
} from './interface'

export { SupabaseStorage } from './providers/supabase'
export { S3Storage } from './providers/s3'

// ============================================================================
// MIGRATION HELPER
// ============================================================================

/**
 * Helper for migrating from direct Supabase Storage usage to abstraction layer
 *
 * Before:
 *   import { supabase } from '@/integrations/supabase/client'
 *   const { data } = await supabase.storage.from('avatars').upload('profile.jpg', file)
 *
 * After:
 *   import { storage } from '@/lib/storage'
 *   const { data: url } = await storage.upload('avatars', 'profile.jpg', file)
 */
export const migrationGuide = {
  upload: 'storage.upload(bucket, path, file, options)',
  download: 'storage.download(bucket, path)',
  remove: 'storage.delete(bucket, path) or storage.deleteMany(bucket, paths)',
  list: 'storage.list(bucket, { prefix, limit, offset })',
  getPublicUrl: 'storage.getPublicUrl(bucket, path)',
  createSignedUrl: 'storage.createSignedUrl(bucket, path, { expiresIn })',
  move: 'storage.move(bucket, fromPath, toPath)',
  copy: 'storage.copy(sourceBucket, sourcePath, destBucket, destPath)',
}

// ============================================================================
// EXAMPLES
// ============================================================================

/**
 * EXAMPLE USAGE:
 *
 * // Upload file
 * const { data: url, error } = await storage.upload(
 *   'avatars',
 *   `${userId}/profile.jpg`,
 *   fileBlob,
 *   { contentType: 'image/jpeg', upsert: true }
 * )
 *
 * // Download file
 * const { data: blob, error } = await storage.download('avatars', `${userId}/profile.jpg`)
 *
 * // Delete file
 * const { data: success, error } = await storage.delete('avatars', `${userId}/profile.jpg`)
 *
 * // List files
 * const { data: files, error } = await storage.list('avatars', {
 *   prefix: `${userId}/`,
 *   limit: 10
 * })
 *
 * // Get public URL
 * const url = storage.getPublicUrl('avatars', `${userId}/profile.jpg`)
 *
 * // Create signed URL (for private files)
 * const { data: signedUrl, error } = await storage.createSignedUrl(
 *   'private-docs',
 *   `${userId}/document.pdf`,
 *   { expiresIn: 3600 } // 1 hour
 * )
 *
 * // Upload with progress tracking
 * const { url, error, abort } = await storage.uploadWithProgress(
 *   'avatars',
 *   `${userId}/profile.jpg`,
 *   file,
 *   (progress) => console.log(`Upload: ${progress}%`)
 * )
 *
 * // Abort upload
 * abort()
 */
