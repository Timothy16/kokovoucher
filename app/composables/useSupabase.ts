// app/composables/useSupabase.ts
// Browser Supabase client (anon key). It can only READ, and only what Row Level Security
// allows for the signed-in user. All writes go through /api via useApi().
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/types/database.types'

let client: SupabaseClient<Database> | null = null
let landingHash = ''

/**
 * Params from the URL hash the page was first loaded with (e.g. `type=recovery` from a
 * password-reset link). Captured before the client parses and clears the hash.
 */
export function authLandingParams() {
  useSupabase()
  return new URLSearchParams(landingHash.slice(1))
}

export function useSupabase() {
  if (!client) {
    landingHash = window.location.hash
    const config = useRuntimeConfig()
    client = createClient<Database>(config.public.supabaseUrl, config.public.supabaseAnonKey)
  }
  return client
}

export type ImageBucket = 'combo-images' | 'restaurant-logos'

const IMAGE_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/**
 * Uploads an image picked in ImageUpload (a data URL) to a public bucket and returns its
 * object path. Only admins can upload (storage policy); the bucket enforces size and type.
 */
export async function uploadImage(bucket: ImageBucket, dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob()
  const ext = IMAGE_EXT[blob.type]
  if (!ext) throw new Error('Use a JPG, PNG or WebP image.')
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await useSupabase().storage.from(bucket).upload(path, blob, { contentType: blob.type })
  if (error) throw new Error(error.message.includes('size') ? 'Image is too large — keep it under 2MB.' : 'Could not upload the image. Please try again.')
  return path
}

/**
 * Resolves an ImageUpload field on save: a new data URL is uploaded (returns its new path),
 * an empty field means removed (null), anything else is the untouched original.
 */
export async function resolveImageField(bucket: ImageBucket, value: string | null, originalPath: string | null) {
  if (!value) return null
  if (value.startsWith('data:')) return uploadImage(bucket, value)
  return originalPath
}

/** Deletes an uploaded image that ended up unused (e.g. the save that needed it failed). */
export async function discardImage(bucket: ImageBucket, path: string | null) {
  if (path) await useSupabase().storage.from(bucket).remove([path])
}

/** Public URL for an object in a public storage bucket (combo photos, restaurant logos). */
export function storagePublicUrl(bucket: ImageBucket, path: string | null) {
  if (!path) return null
  return useSupabase().storage.from(bucket).getPublicUrl(path).data.publicUrl
}
