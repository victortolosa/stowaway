/**
 * Migration Script: Encrypt existing plaintext data
 *
 * This script:
 * 1. Generates a DEK for each place that doesn't have one yet
 * 2. Encrypts plaintext fields on places, containers, items, groups, and activity logs
 *
 * Prerequisites:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   export FIREBASE_PROJECT_ID=your-project-id
 *
 * Usage:
 *   node scripts/migrate-encrypt-data.mjs --dry-run   # preview changes
 *   node scripts/migrate-encrypt-data.mjs              # execute
 */

import admin from 'firebase-admin'
import { webcrypto } from 'node:crypto'

// Polyfill for Node.js < 19 where crypto.subtle isn't global
const subtle = webcrypto.subtle

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT
const dryRun = process.argv.includes('--dry-run')
const pageSize = Number(process.env.PAGE_SIZE || 500)

if (!projectId) {
  console.error('Missing FIREBASE_PROJECT_ID or GCLOUD_PROJECT')
  process.exit(1)
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS is required (path to service account JSON)')
  process.exit(1)
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  })
}

const db = admin.firestore()
const ENC_PREFIX = 'enc:'

// ─── Crypto helpers (mirrors src/lib/encryption.ts) ───

async function generateKey() {
  const key = await subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const raw = await subtle.exportKey('raw', key)
  return {
    base64: Buffer.from(raw).toString('base64'),
    cryptoKey: key,
  }
}

async function importKey(base64Key) {
  const raw = Buffer.from(base64Key, 'base64')
  return subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

async function encrypt(plaintext, key) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = Buffer.concat([Buffer.from(iv), Buffer.from(ciphertext)])
  return ENC_PREFIX + combined.toString('base64')
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX)
}

// ─── Pagination helper ───

async function forEachDoc(collectionPath, handler) {
  let lastDoc = null
  let count = 0
  while (true) {
    let query = db.collection(collectionPath)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize)
    if (lastDoc) query = query.startAfter(lastDoc)
    const snapshot = await query.get()
    if (snapshot.empty) break
    for (const docSnap of snapshot.docs) {
      await handler(docSnap)
      count++
    }
    lastDoc = snapshot.docs[snapshot.docs.length - 1]
  }
  return count
}

// ─── Key cache ───

const keyCache = new Map() // placeId -> CryptoKey

async function getOrCreatePlaceKey(placeId) {
  if (keyCache.has(placeId)) return keyCache.get(placeId)

  const keyDocRef = db.doc(`places/${placeId}/keys/dek`)
  const keyDoc = await keyDocRef.get()

  let cryptoKey
  if (keyDoc.exists) {
    const { key } = keyDoc.data()
    cryptoKey = await importKey(key)
    console.log(`  Key exists for place ${placeId}`)
  } else {
    const { base64, cryptoKey: newKey } = await generateKey()
    cryptoKey = newKey
    if (!dryRun) {
      await keyDocRef.set({ key: base64 })
    }
    console.log(`  Generated new key for place ${placeId}${dryRun ? ' (dry run)' : ''}`)
  }

  keyCache.set(placeId, cryptoKey)
  return cryptoKey
}

// ─── Encryption helpers ───

async function encryptStringField(value, key) {
  if (!value || typeof value !== 'string' || isEncrypted(value)) return null
  return encrypt(value, key)
}

async function encryptStringArray(arr, key) {
  if (!Array.isArray(arr) || arr.length === 0) return null
  let changed = false
  const result = await Promise.all(
    arr.map(async (v) => {
      if (typeof v === 'string' && !isEncrypted(v)) {
        changed = true
        return encrypt(v, key)
      }
      return v
    })
  )
  return changed ? result : null
}

// ─── Step 1: Generate keys for all places ───

async function generatePlaceKeys() {
  console.log('\n═══ Step 1: Generating DEKs for places ═══')
  let created = 0
  let existed = 0

  await forEachDoc('places', async (docSnap) => {
    const keyDocRef = db.doc(`places/${docSnap.id}/keys/dek`)
    const keyDoc = await keyDocRef.get()
    if (keyDoc.exists) {
      existed++
      // Still import to cache
      const { key } = keyDoc.data()
      keyCache.set(docSnap.id, await importKey(key))
    } else {
      const { base64, cryptoKey } = await generateKey()
      keyCache.set(docSnap.id, cryptoKey)
      if (!dryRun) {
        await keyDocRef.set({ key: base64 })
      }
      created++
    }
  })

  console.log(`  Keys already existed: ${existed}`)
  console.log(`  Keys created: ${created}${dryRun ? ' (dry run)' : ''}`)
}

// ─── Step 2: Encrypt places ───

async function encryptPlaces() {
  console.log('\n═══ Step 2: Encrypting places ═══')
  let updated = 0
  let skipped = 0
  const writer = db.bulkWriter()

  await forEachDoc('places', async (docSnap) => {
    const data = docSnap.data()
    const key = keyCache.get(docSnap.id)
    if (!key) { skipped++; return }

    const updates = {}
    const encName = await encryptStringField(data.name, key)
    if (encName) updates.name = encName

    if (Object.keys(updates).length > 0) {
      updated++
      if (!dryRun) writer.update(docSnap.ref, updates)
    } else {
      skipped++
    }
  })

  if (!dryRun) await writer.close()
  console.log(`  Encrypted: ${updated}, Skipped: ${skipped}${dryRun ? ' (dry run)' : ''}`)
}

// ─── Step 3: Encrypt containers ───

async function encryptContainers() {
  console.log('\n═══ Step 3: Encrypting containers ═══')
  let updated = 0
  let skipped = 0
  const writer = db.bulkWriter()

  await forEachDoc('containers', async (docSnap) => {
    const data = docSnap.data()
    if (!data.placeId) { skipped++; return }
    const key = keyCache.get(data.placeId)
    if (!key) { skipped++; return }

    const updates = {}
    const encName = await encryptStringField(data.name, key)
    if (encName) updates.name = encName

    if (Object.keys(updates).length > 0) {
      updated++
      if (!dryRun) writer.update(docSnap.ref, updates)
    } else {
      skipped++
    }
  })

  if (!dryRun) await writer.close()
  console.log(`  Encrypted: ${updated}, Skipped: ${skipped}${dryRun ? ' (dry run)' : ''}`)
}

// ─── Step 4: Encrypt items ───

// Pre-load container->placeId map for items without placeId
const containerPlaceMap = new Map()

async function warmContainers() {
  await forEachDoc('containers', async (docSnap) => {
    const data = docSnap.data()
    if (data.placeId) containerPlaceMap.set(docSnap.id, data.placeId)
  })
  console.log(`  Loaded ${containerPlaceMap.size} container->placeId mappings`)
}

async function encryptItems() {
  console.log('\n═══ Step 4: Encrypting items ═══')
  await warmContainers()

  let updated = 0
  let skipped = 0
  const writer = db.bulkWriter()

  await forEachDoc('items', async (docSnap) => {
    const data = docSnap.data()
    const placeId = data.placeId || containerPlaceMap.get(data.containerId)
    if (!placeId) { skipped++; return }
    const key = keyCache.get(placeId)
    if (!key) { skipped++; return }

    const updates = {}
    const encName = await encryptStringField(data.name, key)
    if (encName) updates.name = encName

    const encDesc = await encryptStringField(data.description, key)
    if (encDesc) updates.description = encDesc

    const encTags = await encryptStringArray(data.tags, key)
    if (encTags) updates.tags = encTags

    if (Object.keys(updates).length > 0) {
      updated++
      if (!dryRun) writer.update(docSnap.ref, updates)
    } else {
      skipped++
    }
  })

  if (!dryRun) await writer.close()
  console.log(`  Encrypted: ${updated}, Skipped: ${skipped}${dryRun ? ' (dry run)' : ''}`)
}

// ─── Step 5: Encrypt groups ───

async function encryptGroups() {
  console.log('\n═══ Step 5: Encrypting groups ═══')
  let updated = 0
  let skipped = 0
  const writer = db.bulkWriter()

  await forEachDoc('groups', async (docSnap) => {
    const data = docSnap.data()
    if (!data.placeId) { skipped++; return }
    const key = keyCache.get(data.placeId)
    if (!key) { skipped++; return }

    const updates = {}
    const encName = await encryptStringField(data.name, key)
    if (encName) updates.name = encName

    if (Object.keys(updates).length > 0) {
      updated++
      if (!dryRun) writer.update(docSnap.ref, updates)
    } else {
      skipped++
    }
  })

  if (!dryRun) await writer.close()
  console.log(`  Encrypted: ${updated}, Skipped: ${skipped}${dryRun ? ' (dry run)' : ''}`)
}

// ─── Step 6: Encrypt activity logs ───

const activityMetadataStringFields = [
  'oldValue', 'newValue',
  'childEntityName',
  'fromContainerName', 'toContainerName',
  'fromPlaceName', 'toPlaceName',
  'groupName',
]

async function encryptActivity() {
  console.log('\n═══ Step 6: Encrypting activity logs ═══')
  let updated = 0
  let skipped = 0
  const writer = db.bulkWriter()

  await forEachDoc('activity', async (docSnap) => {
    const data = docSnap.data()
    if (!data.placeId) { skipped++; return }
    const key = keyCache.get(data.placeId)
    if (!key) { skipped++; return }

    const updates = {}

    // Encrypt entityName
    const encName = await encryptStringField(data.entityName, key)
    if (encName) updates.entityName = encName

    // Encrypt metadata string fields
    if (data.metadata && typeof data.metadata === 'object') {
      let metadataChanged = false
      const newMetadata = { ...data.metadata }

      for (const field of activityMetadataStringFields) {
        const enc = await encryptStringField(newMetadata[field], key)
        if (enc) {
          newMetadata[field] = enc
          metadataChanged = true
        }
      }

      // Encrypt itemNames array
      const encItemNames = await encryptStringArray(newMetadata.itemNames, key)
      if (encItemNames) {
        newMetadata.itemNames = encItemNames
        metadataChanged = true
      }

      if (metadataChanged) updates.metadata = newMetadata
    }

    if (Object.keys(updates).length > 0) {
      updated++
      if (!dryRun) writer.update(docSnap.ref, updates)
    } else {
      skipped++
    }
  })

  if (!dryRun) await writer.close()
  console.log(`  Encrypted: ${updated}, Skipped: ${skipped}${dryRun ? ' (dry run)' : ''}`)
}

// ─── Run ───

async function run() {
  console.log(`\nEncryption migration${dryRun ? ' (DRY RUN)' : ''}`)
  console.log(`Project: ${projectId}\n`)

  await generatePlaceKeys()
  await encryptPlaces()
  await encryptContainers()
  await encryptItems()
  await encryptGroups()
  await encryptActivity()

  console.log('\n✓ Migration complete')
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
