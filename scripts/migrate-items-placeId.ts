/**
 * Migration Script: Add placeId to existing items
 *
 * This script adds the placeId field to items that don't have it yet.
 * Run this once to migrate existing data, then the app will handle new items automatically.
 *
 * Usage:
 * 1. Set your Firebase config in .env
 * 2. Run: npx tsx scripts/migrate-items-placeId.ts
 */

import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore'

// Initialize Firebase (you'll need to add your config)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateItems() {
  console.log('Starting migration...')

  try {
    // Get all items
    const itemsSnapshot = await getDocs(collection(db, 'items'))
    console.log(`Found ${itemsSnapshot.size} total items`)

    let migratedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const itemDoc of itemsSnapshot.docs) {
      const item = itemDoc.data()

      // Skip if already has placeId
      if (item.placeId) {
        skippedCount++
        continue
      }

      try {
        // Get the container to find placeId
        const containerDoc = await getDoc(doc(db, 'containers', item.containerId))

        if (!containerDoc.exists()) {
          console.warn(`Container ${item.containerId} not found for item ${itemDoc.id}`)
          errorCount++
          continue
        }

        const container = containerDoc.data()

        if (!container.placeId) {
          console.warn(`Container ${item.containerId} has no placeId`)
          errorCount++
          continue
        }

        // Update item with placeId
        await updateDoc(doc(db, 'items', itemDoc.id), {
          placeId: container.placeId,
          updatedAt: new Date()
        })

        migratedCount++

        if (migratedCount % 10 === 0) {
          console.log(`Progress: ${migratedCount} items migrated...`)
        }
      } catch (error) {
        console.error(`Error migrating item ${itemDoc.id}:`, error)
        errorCount++
      }
    }

    console.log('\n=== Migration Complete ===')
    console.log(`Total items: ${itemsSnapshot.size}`)
    console.log(`Migrated: ${migratedCount}`)
    console.log(`Skipped (already had placeId): ${skippedCount}`)
    console.log(`Errors: ${errorCount}`)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateItems()
  .then(() => {
    console.log('\nMigration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
