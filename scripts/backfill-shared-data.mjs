import admin from 'firebase-admin'
import { pathToFileURL } from 'node:url'

const pageSize = Number(process.env.PAGE_SIZE || 500)

const unique = (values) => Array.from(new Set(values.filter(Boolean)))

async function forEachDoc(db, collectionName, handler) {
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

export async function warmContainers(db) {
  const containerPlaceMap = new Map()
  console.log('Loading containers...')
  await forEachDoc(db, 'containers', async (docSnap) => {
    const data = docSnap.data()
    if (data && data.placeId) {
      containerPlaceMap.set(docSnap.id, data.placeId)
    }
  })
  console.log(`Loaded ${containerPlaceMap.size} container placeIds`)
  return containerPlaceMap
}

export async function backfillPlaces(db, { dryRun } = {}) {
  console.log('Backfilling places...')
  const writer = db.bulkWriter()
  let updated = 0
  await forEachDoc(db, 'places', async (docSnap) => {
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
  return updated
}

export async function backfillItems(db, containerPlaceMap, { dryRun } = {}) {
  console.log('Backfilling items...')
  const writer = db.bulkWriter()
  let updated = 0
  await forEachDoc(db, 'items', async (docSnap) => {
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
  return updated
}

export async function backfillGroups(db, containerPlaceMap, { dryRun } = {}) {
  console.log('Backfilling groups...')
  const writer = db.bulkWriter()
  let updated = 0
  await forEachDoc(db, 'groups', async (docSnap) => {
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
  return updated
}

/**
 * Report items whose denormalized placeId disagrees with their container's
 * placeId (or is missing / points at an unknown container). Read-only.
 */
export async function checkIntegrity(db) {
  const containerPlaceMap = await warmContainers(db)
  const problems = { missingPlaceId: [], badContainerRef: [], mismatch: [] }

  await forEachDoc(db, 'items', async (docSnap) => {
    const data = docSnap.data()
    const id = docSnap.id
    const containerPlaceId = data.containerId ? containerPlaceMap.get(data.containerId) : undefined

    if (containerPlaceId === undefined) {
      problems.badContainerRef.push({ id, containerId: data.containerId ?? null })
      return
    }
    if (!data.placeId) {
      problems.missingPlaceId.push({ id, expected: containerPlaceId })
      return
    }
    if (data.placeId !== containerPlaceId) {
      problems.mismatch.push({ id, itemPlaceId: data.placeId, containerPlaceId })
    }
  })

  const total = problems.missingPlaceId.length + problems.badContainerRef.length + problems.mismatch.length
  console.log(`Integrity check: ${total} problem item(s)`)
  console.log(`  placeId != container placeId: ${problems.mismatch.length}`)
  console.log(`  missing placeId:              ${problems.missingPlaceId.length}`)
  console.log(`  unknown/missing container:    ${problems.badContainerRef.length}`)
  for (const p of problems.mismatch) {
    console.warn(`  MISMATCH item ${p.id}: item.placeId=${p.itemPlaceId} container.placeId=${p.containerPlaceId}`)
  }
  for (const p of problems.missingPlaceId) {
    console.warn(`  MISSING placeId item ${p.id} (container placeId=${p.expected})`)
  }
  for (const p of problems.badContainerRef) {
    console.warn(`  BAD container ref item ${p.id} (containerId=${p.containerId})`)
  }
  return problems
}

export async function runBackfill(db, { dryRun } = {}) {
  const containerPlaceMap = await warmContainers(db)
  const places = await backfillPlaces(db, { dryRun })
  const items = await backfillItems(db, containerPlaceMap, { dryRun })
  const groups = await backfillGroups(db, containerPlaceMap, { dryRun })
  console.log('Backfill complete')
  return { places, items, groups }
}

// CLI entrypoint — only runs when invoked directly (`node scripts/backfill-shared-data.mjs`),
// not when imported by tests. Keeps admin bootstrap + credentials out of imports.
async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT
  const dryRun = process.argv.includes('--dry-run')

  if (!projectId) {
    console.error('Missing FIREBASE_PROJECT_ID or GCLOUD_PROJECT')
    process.exit(1)
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS is required (path to service account JSON)')
    process.exit(1)
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId })
  }

  // `--check` is a read-only integrity report; otherwise run the backfill.
  if (process.argv.includes('--check')) {
    await checkIntegrity(admin.firestore())
    return
  }
  await runBackfill(admin.firestore(), { dryRun })
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
}
