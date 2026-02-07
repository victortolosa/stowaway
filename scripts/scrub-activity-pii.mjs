/**
 * Migration Script: Remove PII from existing activity logs
 *
 * Removes actorName, actorEmail, actorPhotoURL fields from all activity documents.
 * The userId field is preserved — actor info is resolved at display time.
 *
 * Prerequisites:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   export FIREBASE_PROJECT_ID=your-project-id
 *
 * Usage:
 *   node scripts/scrub-activity-pii.mjs --dry-run   # preview changes
 *   node scripts/scrub-activity-pii.mjs              # execute
 */

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
const FieldValue = admin.firestore.FieldValue

async function run() {
  console.log(`\nPII scrub migration${dryRun ? ' (DRY RUN)' : ''}`)
  console.log(`Project: ${projectId}\n`)

  let lastDoc = null
  let scrubbed = 0
  let skipped = 0
  let total = 0
  const writer = db.bulkWriter()

  while (true) {
    let query = db.collection('activity')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize)
    if (lastDoc) query = query.startAfter(lastDoc)
    const snapshot = await query.get()
    if (snapshot.empty) break

    for (const docSnap of snapshot.docs) {
      total++
      const data = docSnap.data()

      const hasPII =
        data.actorName !== undefined ||
        data.actorEmail !== undefined ||
        data.actorPhotoURL !== undefined

      if (!hasPII) {
        skipped++
        continue
      }

      scrubbed++
      if (!dryRun) {
        writer.update(docSnap.ref, {
          actorName: FieldValue.delete(),
          actorEmail: FieldValue.delete(),
          actorPhotoURL: FieldValue.delete(),
        })
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1]
    process.stdout.write(`\r  Processed: ${total}, Scrubbed: ${scrubbed}, Clean: ${skipped}`)
  }

  if (!dryRun) await writer.close()
  console.log(`\n\n  Total docs:   ${total}`)
  console.log(`  Scrubbed:     ${scrubbed}`)
  console.log(`  Already clean: ${skipped}`)
  console.log(`\n✓ PII scrub complete${dryRun ? ' (dry run)' : ''}`)
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
