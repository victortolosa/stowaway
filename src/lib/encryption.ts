import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'

const ENC_PREFIX = 'enc:'
const keyCache = new Map<string, CryptoKey>()

/**
 * Clear the key cache (call on logout)
 */
export function clearKeyCache() {
  keyCache.clear()
}

/**
 * Generate a new AES-256-GCM key and return it as a base64-encoded raw key
 */
export async function generatePlaceKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const rawKey = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(rawKey)))
}

/**
 * Store a place's data encryption key in Firestore
 */
export async function storePlaceKey(placeId: string, key: string): Promise<void> {
  await setDoc(doc(db, 'places', placeId, 'keys', 'dek'), { key })
}

/**
 * Get the CryptoKey for a place (with caching)
 */
export async function getPlaceKey(placeId: string): Promise<CryptoKey | null> {
  const cached = keyCache.get(placeId)
  if (cached) return cached

  const docSnap = await getDoc(doc(db, 'places', placeId, 'keys', 'dek'))
  if (!docSnap.exists()) return null

  const { key } = docSnap.data() as { key: string }
  const cryptoKey = await importKey(key)
  keyCache.set(placeId, cryptoKey)
  return cryptoKey
}

/**
 * Import a base64-encoded raw key into a CryptoKey
 */
async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * Encrypt a plaintext string. Returns `enc:<base64(iv + ciphertext)>`
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  // Concatenate iv + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return ENC_PREFIX + btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt an `enc:` prefixed value. If the value doesn't have the prefix,
 * return it as-is (backward compat with unencrypted data).
 */
export async function decrypt(
  value: string,
  key: CryptoKey
): Promise<string> {
  if (!value.startsWith(ENC_PREFIX)) return value

  try {
    const data = Uint8Array.from(
      atob(value.slice(ENC_PREFIX.length)),
      (c) => c.charCodeAt(0)
    )
    const iv = data.slice(0, 12)
    const ciphertext = data.slice(12)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    return new TextDecoder().decode(decrypted)
  } catch (err) {
    console.warn('Failed to decrypt value, returning as-is:', err)
    return value
  }
}

/**
 * Encrypt specified string fields on an object.
 * Returns a new object with those fields encrypted.
 */
export async function encryptFields<T>(
  obj: T,
  fields: string[],
  key: CryptoKey
): Promise<T> {
  const result = { ...obj } as Record<string, unknown>
  for (const field of fields) {
    const value = result[field]
    if (typeof value === 'string') {
      result[field] = await encrypt(value, key)
    } else if (Array.isArray(value)) {
      result[field] = await Promise.all(
        value.map((v: unknown) => (typeof v === 'string' ? encrypt(v, key) : v))
      )
    }
  }
  return result as T
}

/**
 * Decrypt specified string fields on an object.
 * Returns a new object with those fields decrypted.
 * Gracefully handles unencrypted values (no enc: prefix).
 */
export async function decryptFields<T>(
  obj: T,
  fields: string[],
  key: CryptoKey
): Promise<T> {
  try {
    const result = { ...obj } as Record<string, unknown>
    for (const field of fields) {
      const value = result[field]
      if (typeof value === 'string') {
        result[field] = await decrypt(value, key)
      } else if (Array.isArray(value)) {
        result[field] = await Promise.all(
          value.map((v: unknown) => (typeof v === 'string' ? decrypt(v, key) : v))
        )
      }
    }
    return result as T
  } catch (err) {
    console.warn('Failed to decrypt fields, returning original object:', err)
    return obj
  }
}

/**
 * Encrypt metadata string values for activity logs
 */
export async function encryptMetadata<T>(
  metadata: T | null | undefined,
  key: CryptoKey
): Promise<T | null | undefined> {
  if (!metadata) return metadata

  const result = { ...metadata } as Record<string, unknown>
  const stringFields = [
    'oldValue', 'newValue',
    'childEntityName',
    'fromContainerName', 'toContainerName',
    'fromPlaceName', 'toPlaceName',
    'groupName',
  ]
  for (const field of stringFields) {
    if (typeof result[field] === 'string') {
      result[field] = await encrypt(result[field] as string, key)
    }
  }
  // Encrypt itemNames array
  if (Array.isArray(result.itemNames)) {
    result.itemNames = await Promise.all(
      (result.itemNames as string[]).map((name) => encrypt(name, key))
    )
  }
  return result as T
}

/**
 * Decrypt metadata string values for activity logs
 */
export async function decryptMetadata<T>(
  metadata: T | null | undefined,
  key: CryptoKey
): Promise<T | null | undefined> {
  if (!metadata) return metadata

  try {
    const result = { ...metadata } as Record<string, unknown>
    const stringFields = [
      'oldValue', 'newValue',
      'childEntityName',
      'fromContainerName', 'toContainerName',
      'fromPlaceName', 'toPlaceName',
      'groupName',
    ]
    for (const field of stringFields) {
      if (typeof result[field] === 'string') {
        result[field] = await decrypt(result[field] as string, key)
      }
    }
    // Decrypt itemNames array
    if (Array.isArray(result.itemNames)) {
      result.itemNames = await Promise.all(
        (result.itemNames as string[]).map((name) => decrypt(name, key))
      )
    }
    return result as T
  } catch (err) {
    console.warn('Failed to decrypt metadata, returning original:', err)
    return metadata
  }
}

// Clear key cache on auth state changes (logout)
auth.onAuthStateChanged((user) => {
  if (!user) {
    clearKeyCache()
  }
})
