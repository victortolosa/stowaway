import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import admin from 'firebase-admin'
import { runBackfill, backfillItems, warmContainers, checkIntegrity } from '../../scripts/backfill-shared-data.mjs'
import { emulatorAvailable } from './helpers'

const PROJECT_ID = 'stowaway-migration-test'

const describeMigration = emulatorAvailable ? describe : describe.skip
if (!emulatorAvailable) {
  console.warn('[migration] FIRESTORE_EMULATOR_HOST not set — skipping. Run `npm run test:rules`.')
}

describeMigration('backfill-shared-data (legacy item migration)', () => {
  let db: admin.firestore.Firestore

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: PROJECT_ID })
    }
    db = admin.firestore()
  })

  afterAll(async () => {
    await Promise.all(admin.apps.map((app) => app?.delete()))
  })

  beforeEach(async () => {
    // Wipe the migration project's data via the emulator REST endpoint.
    const host = process.env.FIRESTORE_EMULATOR_HOST
    await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
      method: 'DELETE',
    })
  })

  async function seedBaseline() {
    await db.collection('containers').doc('c1').set({ placeId: 'p1', name: 'enc:box' })
    // legacy item: no placeId, but a valid container
    await db.collection('items').doc('legacy').set({ containerId: 'c1', name: 'enc:old' })
    // already-migrated item: keeps its placeId untouched
    await db.collection('items').doc('current').set({ containerId: 'c1', placeId: 'p1', name: 'enc:new' })
    // orphan item: container has no known placeId -> left alone
    await db.collection('items').doc('orphan').set({ containerId: 'missing', name: 'enc:orphan' })
  }

  it('backfills placeId onto legacy items from their container', async () => {
    await seedBaseline()
    const containerMap = await warmContainers(db)
    const updated = await backfillItems(db, containerMap, { dryRun: false })

    expect(updated).toBe(1)
    const legacy = await db.collection('items').doc('legacy').get()
    expect(legacy.data()?.placeId).toBe('p1')
  })

  it('leaves already-migrated and orphan items unchanged', async () => {
    await seedBaseline()
    const containerMap = await warmContainers(db)
    await backfillItems(db, containerMap, { dryRun: false })

    const current = await db.collection('items').doc('current').get()
    expect(current.data()?.placeId).toBe('p1')
    const orphan = await db.collection('items').doc('orphan').get()
    expect(orphan.data()?.placeId).toBeUndefined()
  })

  it('dry-run reports the count without writing', async () => {
    await seedBaseline()
    const containerMap = await warmContainers(db)
    const updated = await backfillItems(db, containerMap, { dryRun: true })

    expect(updated).toBe(1)
    const legacy = await db.collection('items').doc('legacy').get()
    expect(legacy.data()?.placeId).toBeUndefined()
  })

  it('re-running after a real migration reports zero remaining (idempotent)', async () => {
    await seedBaseline()
    await runBackfill(db, { dryRun: false })
    const second = await runBackfill(db, { dryRun: true })
    expect(second.items).toBe(0)
  })

  it('checkIntegrity flags items whose placeId disagrees with their container', async () => {
    await db.collection('containers').doc('c1').set({ placeId: 'p1', name: 'enc:box' })
    await db.collection('items').doc('good').set({ containerId: 'c1', placeId: 'p1', name: 'enc:ok' })
    await db.collection('items').doc('bad').set({ containerId: 'c1', placeId: 'pWRONG', name: 'enc:bad' })
    await db.collection('items').doc('missing').set({ containerId: 'c1', name: 'enc:nope' })
    await db.collection('items').doc('orphan').set({ containerId: 'gone', placeId: 'p1', name: 'enc:orphan' })

    const problems = await checkIntegrity(db)

    expect(problems.mismatch.map((p: { id: string }) => p.id)).toEqual(['bad'])
    expect(problems.missingPlaceId.map((p: { id: string }) => p.id)).toEqual(['missing'])
    expect(problems.badContainerRef.map((p: { id: string }) => p.id)).toEqual(['orphan'])
  })
})
