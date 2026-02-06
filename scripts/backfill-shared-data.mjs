import admin from 'firebase-admin'

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
const containerPlaceMap = new Map()

const unique = (values) => Array.from(new Set(values.filter(Boolean)))

async function forEachDoc(collectionName, handler) {
  let lastDoc = null
  while (true) {
    let query = db.collection(collectionName).orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize)
    if (lastDoc) query = query.startAfter(lastDoc)
    const snapshot = await query.get()
    if (snapshot.empty) break
    for (const docSnap of snapshot.docs) {
      await handler(docSnap)
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

async function backfillPlaces() {
  console.log('Backfilling places...')
  const writer = db.bulkWriter()
  let updated = 0
  await forEachDoc('places', async (docSnap) => {
    const data = docSnap.data()
    const ownerId = data.ownerId || data.userId
    if (!ownerId) return

    const memberIds = Array.isArray(data.memberIds) ? data.memberIds : []
    const normalizedMemberIds = unique([ownerId, ...memberIds])

    const memberRoles = { ...(data.memberRoles || {}) }
    memberRoles[ownerId] = 'owner'
    normalizedMemberIds.forEach((id) => {
      if (!memberRoles[id]) memberRoles[id] = id === ownerId ? 'owner' : 'viewer'
    })

    const updates = {}
    if (data.ownerId !== ownerId) updates.ownerId = ownerId
    if (JSON.stringify(memberIds) !== JSON.stringify(normalizedMemberIds)) updates.memberIds = normalizedMemberIds
    if (JSON.stringify(data.memberRoles || {}) !== JSON.stringify(memberRoles)) updates.memberRoles = memberRoles

    if (Object.keys(updates).length > 0) {
      updated += 1
      if (!dryRun) writer.update(docSnap.ref, updates)
    }
  })
  if (!dryRun) await writer.close()
  console.log(`Places updated: ${updated}${dryRun ? ' (dry run)' : ''}`)
}

async function backfillItems() {
  console.log('Backfilling items...')
  const writer = db.bulkWriter()
  let updated = 0
  await forEachDoc('items', async (docSnap) => {
    const data = docSnap.data()
    if (data.placeId) return
    const containerId = data.containerId
    if (!containerId) return
    const placeId = containerPlaceMap.get(containerId)
    if (!placeId) return
    updated += 1
    if (!dryRun) writer.update(docSnap.ref, { placeId })
  })
  if (!dryRun) await writer.close()
  console.log(`Items updated: ${updated}${dryRun ? ' (dry run)' : ''}`)
}

async function backfillGroups() {
  console.log('Backfilling groups...')
  const writer = db.bulkWriter()
  let updated = 0
  await forEachDoc('groups', async (docSnap) => {
    const data = docSnap.data()
    const type = data.type
    if (!type) return

    let placeId = data.placeId
    if (placeId !== undefined) return

    if (type === 'place') {
      placeId = null
    } else if (type === 'container') {
      placeId = data.parentId || null
    } else if (type === 'item') {
      const containerId = data.parentId
      placeId = containerId ? containerPlaceMap.get(containerId) || null : null
    }

    updated += 1
    if (!dryRun) writer.update(docSnap.ref, { placeId })
  })
  if (!dryRun) await writer.close()
  console.log(`Groups updated: ${updated}${dryRun ? ' (dry run)' : ''}`)
}

async function run() {
  await warmContainers()
  await backfillPlaces()
  await backfillItems()
  await backfillGroups()
  console.log('Backfill complete')
}

run().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
