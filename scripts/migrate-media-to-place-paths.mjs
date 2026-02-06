import admin from 'firebase-admin'
import path from 'path'
import crypto from 'crypto'

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT
const dryRun = process.argv.includes('--dry-run')
const pageSize = Number(process.env.PAGE_SIZE || 250)
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const docLimit = limitArg ? Number(limitArg.split('=')[1]) : null

if (!projectId) {
  console.error('Missing FIREBASE_PROJECT_ID or GCLOUD_PROJECT')
  process.exit(1)
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS is required (path to service account JSON)')
  process.exit(1)
}

const defaultBucket = `${projectId}.appspot.com`
const bucketName =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.GCLOUD_STORAGE_BUCKET ||
  defaultBucket

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
    storageBucket: bucketName,
  })
}

const db = admin.firestore()
const bucket = admin.storage().bucket(bucketName)
const containerPlaceMap = new Map()
const movedUrlMap = new Map()

const stats = {
  plannedMoves: 0,
  moved: 0,
  updatedDocs: 0,
  skippedMissingPlace: 0,
  skippedNoPath: 0,
  skippedNonFirebase: 0,
  failedMoves: 0,
}

function parseStoragePath(url) {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('urn:stowaway:pending:')) return null

  if (url.startsWith('gs://')) {
    const withoutScheme = url.slice('gs://'.length)
    const firstSlash = withoutScheme.indexOf('/')
    if (firstSlash === -1) return null
    const urlBucket = withoutScheme.slice(0, firstSlash)
    if (urlBucket && urlBucket !== bucketName) return null
    return withoutScheme.slice(firstSlash + 1)
  }

  if (url.includes('firebasestorage.googleapis.com')) {
    try {
      const parsed = new URL(url)
      const fromQuery = parsed.searchParams.get('o')
      if (fromQuery) return decodeURIComponent(fromQuery)
      const match = parsed.pathname.match(/\/o\/(.+)$/)
      if (match && match[1]) return decodeURIComponent(match[1])
    } catch {
      return null
    }
  }

  if (url.includes('storage.googleapis.com')) {
    try {
      const parsed = new URL(url)
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts.length < 2) return null
      const urlBucket = parts[0]
      if (urlBucket && urlBucket !== bucketName) return null
      return parts.slice(1).join('/')
    } catch {
      return null
    }
  }

  return null
}

function isNewPath(storagePath) {
  return (
    storagePath.startsWith('place-media/') ||
    storagePath.startsWith('container-media/') ||
    storagePath.startsWith('item-media/')
  )
}

function isLegacyPath(storagePath) {
  return (
    storagePath.startsWith('places/') ||
    storagePath.startsWith('containers/') ||
    storagePath.startsWith('items/')
  )
}

function buildDestPath(storagePath, kind, placeId) {
  const fileName = path.posix.basename(storagePath)
  if (kind === 'place') return `place-media/${placeId}/${fileName}`
  if (kind === 'container') return `container-media/${placeId}/${fileName}`
  if (kind === 'item-audio') return `item-media/${placeId}/audio/${fileName}`
  return `item-media/${placeId}/${fileName}`
}

async function ensureDownloadUrl(file) {
  const [metadata] = await file.getMetadata()
  let token = metadata?.metadata?.firebaseStorageDownloadTokens
  if (!token) {
    token = crypto.randomUUID()
    await file.setMetadata({
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    })
  }
  const tokenValue = String(token).split(',')[0]
  return `https://firebasestorage.googleapis.com/v0/b/${metadata.bucket}/o/${encodeURIComponent(file.name)}?alt=media&token=${tokenValue}`
}

async function moveObject(sourcePath, destPath) {
  if (movedUrlMap.has(sourcePath)) {
    return movedUrlMap.get(sourcePath)
  }

  stats.plannedMoves += 1

  if (dryRun) {
    return null
  }

  try {
    const sourceFile = bucket.file(sourcePath)
    const [exists] = await sourceFile.exists()
    if (!exists) {
      console.warn(`Source not found: ${sourcePath}`)
      stats.failedMoves += 1
      return null
    }

    let finalDestPath = destPath
    const destFile = bucket.file(destPath)
    const [destExists] = await destFile.exists()
    if (destExists) {
      const suffix = `${Date.now()}_${path.posix.basename(destPath)}`
      finalDestPath = `${path.posix.dirname(destPath)}/${suffix}`
    }

    const finalFile = bucket.file(finalDestPath)
    await sourceFile.copy(finalFile)
    await sourceFile.delete()
    const newUrl = await ensureDownloadUrl(finalFile)
    movedUrlMap.set(sourcePath, newUrl)
    stats.moved += 1
    return newUrl
  } catch (error) {
    console.error(`Failed to move ${sourcePath} -> ${destPath}:`, error)
    stats.failedMoves += 1
    return null
  }
}

async function migrateUrl(url, kind, placeId) {
  const storagePath = parseStoragePath(url)
  if (!storagePath) {
    if (url && url.startsWith('http')) stats.skippedNonFirebase += 1
    else stats.skippedNoPath += 1
    return { url, changed: false }
  }

  if (isNewPath(storagePath)) {
    return { url, changed: false }
  }

  if (!isLegacyPath(storagePath)) {
    stats.skippedNonFirebase += 1
    return { url, changed: false }
  }

  if (!placeId) {
    stats.skippedMissingPlace += 1
    return { url, changed: false }
  }

  const destPath = buildDestPath(storagePath, kind, placeId)
  const newUrl = await moveObject(storagePath, destPath)

  if (dryRun) {
    return { url, changed: true }
  }

  return { url: newUrl || url, changed: Boolean(newUrl) }
}

async function forEachDoc(collectionName, handler) {
  let lastDoc = null
  let processed = 0
  while (true) {
    let query = db.collection(collectionName).orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize)
    if (lastDoc) query = query.startAfter(lastDoc)
    const snapshot = await query.get()
    if (snapshot.empty) break
    for (const docSnap of snapshot.docs) {
      await handler(docSnap)
      processed += 1
      if (docLimit && processed >= docLimit) return
    }
    lastDoc = snapshot.docs[snapshot.docs.length - 1]
  }
}

async function warmContainers() {
  console.log('Loading containers...')
  await forEachDoc('containers', async (docSnap) => {
    const data = docSnap.data()
    if (data && data.placeId) {
      containerPlaceMap.set(docSnap.id, data.placeId)
    }
  })
  console.log(`Loaded ${containerPlaceMap.size} container placeIds`)
}

async function migratePlaces() {
  console.log('Migrating place photos...')
  await forEachDoc('places', async (docSnap) => {
    const data = docSnap.data()
    const photos = Array.isArray(data.photos) ? data.photos : []
    if (photos.length === 0) return

    let changed = false
    const migratedPhotos = []

    for (const url of photos) {
      const result = await migrateUrl(url, 'place', docSnap.id)
      migratedPhotos.push(result.url)
      if (result.changed) changed = true
    }

    if (changed) {
      stats.updatedDocs += 1
      if (!dryRun) {
        await docSnap.ref.update({ photos: migratedPhotos })
      }
    }
  })
}

async function migrateContainers() {
  console.log('Migrating container photos...')
  await forEachDoc('containers', async (docSnap) => {
    const data = docSnap.data()
    const placeId = data.placeId
    const photos = Array.isArray(data.photos) ? data.photos : []
    const photoUrl = typeof data.photoUrl === 'string' ? data.photoUrl : null

    if (!placeId || (photos.length === 0 && !photoUrl)) return

    let changed = false
    const updates = {}

    if (photos.length > 0) {
      const migratedPhotos = []
      for (const url of photos) {
        const result = await migrateUrl(url, 'container', placeId)
        migratedPhotos.push(result.url)
        if (result.changed) changed = true
      }
      updates.photos = migratedPhotos
    }

    if (photoUrl) {
      const result = await migrateUrl(photoUrl, 'container', placeId)
      if (result.changed) changed = true
      updates.photoUrl = result.url
    }

    if (changed) {
      stats.updatedDocs += 1
      if (!dryRun) {
        await docSnap.ref.update(updates)
      }
    }
  })
}

async function migrateItems() {
  console.log('Migrating item media...')
  await forEachDoc('items', async (docSnap) => {
    const data = docSnap.data()
    const resolvedPlaceId = data.placeId || containerPlaceMap.get(data.containerId)
    const needsPlaceIdBackfill = !data.placeId && resolvedPlaceId

    const photos = Array.isArray(data.photos) ? data.photos : []
    const voiceNoteUrl = typeof data.voiceNoteUrl === 'string' ? data.voiceNoteUrl : null

    if (!resolvedPlaceId || (photos.length === 0 && !voiceNoteUrl && !needsPlaceIdBackfill)) return

    let changed = false
    const updates = {}

    if (needsPlaceIdBackfill) {
      updates.placeId = resolvedPlaceId
      changed = true
    }

    if (photos.length > 0) {
      const migratedPhotos = []
      for (const url of photos) {
        const result = await migrateUrl(url, 'item', resolvedPlaceId)
        migratedPhotos.push(result.url)
        if (result.changed) changed = true
      }
      updates.photos = migratedPhotos
    }

    if (voiceNoteUrl) {
      const result = await migrateUrl(voiceNoteUrl, 'item-audio', resolvedPlaceId)
      if (result.changed) changed = true
      updates.voiceNoteUrl = result.url
    }

    if (changed) {
      stats.updatedDocs += 1
      if (!dryRun) {
        await docSnap.ref.update(updates)
      }
    }
  })
}

async function run() {
  console.log(`Bucket: ${bucketName}`)
  console.log(dryRun ? 'Running in dry-run mode' : 'Running in live mode')
  await warmContainers()
  await migratePlaces()
  await migrateContainers()
  await migrateItems()

  console.log('Migration complete')
  console.log(JSON.stringify(stats, null, 2))
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
