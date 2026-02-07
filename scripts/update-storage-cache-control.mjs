/**
 * Migration Script: Update cache-control on existing Storage files
 *
 * Changes all files from `public, max-age=31536000` to `private, max-age=3600`
 *
 * Prerequisites:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   export FIREBASE_PROJECT_ID=your-project-id
 *   export FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app  (or .appspot.com)
 *
 * Usage:
 *   node scripts/update-storage-cache-control.mjs --dry-run   # preview changes
 *   node scripts/update-storage-cache-control.mjs              # execute
 */

import admin from 'firebase-admin'

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
const dryRun = process.argv.includes('--dry-run')

if (!projectId) {
  console.error('Missing FIREBASE_PROJECT_ID or GCLOUD_PROJECT')
  process.exit(1)
}

if (!storageBucket) {
  console.error('Missing FIREBASE_STORAGE_BUCKET (e.g. your-project.firebasestorage.app)')
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
    storageBucket,
  })
}

const bucket = admin.storage().bucket()

async function run() {
  console.log(`\nStorage cache-control migration${dryRun ? ' (DRY RUN)' : ''}`)
  console.log(`Project: ${projectId}`)
  console.log(`Bucket:  ${storageBucket}\n`)

  let updated = 0
  let skipped = 0
  let total = 0

  const [files] = await bucket.getFiles()

  for (const file of files) {
    total++
    const [metadata] = await file.getMetadata()
    const currentCache = metadata.cacheControl || ''

    if (currentCache === 'private, max-age=3600') {
      skipped++
      continue
    }

    updated++
    if (!dryRun) {
      await file.setMetadata({ cacheControl: 'private, max-age=3600' })
    }

    if (total % 50 === 0) {
      process.stdout.write(`\r  Processed: ${total}, Updated: ${updated}, Skipped: ${skipped}`)
    }
  }

  console.log(`\n\n  Total files:    ${total}`)
  console.log(`  Updated:        ${updated}`)
  console.log(`  Already correct: ${skipped}`)
  console.log(`\n✓ Storage cache-control migration complete${dryRun ? ' (dry run)' : ''}`)
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
