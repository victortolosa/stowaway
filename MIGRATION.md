# Data Migration Guide

## Item placeId Denormalization

### What Changed
Items now include a `placeId` field for optimized queries. This eliminates the N+1 query problem when fetching all items for a place.

### Backward Compatibility
The app automatically handles both old and new items:
- **Old items** (without `placeId`): Fetched via container queries (slower)
- **New items** (with `placeId`): Fetched via direct placeId query (fast)

Results are automatically deduplicated and combined.

### Migration Options

#### Option 1: Automatic (Recommended for Small Datasets)
New items are automatically created with `placeId`. Old items will continue to work but with slightly slower queries. No manual migration needed.

#### Option 2: Manual Migration (Recommended for Large Datasets)
Run the migration script to update all existing items at once:

```bash
# Install tsx if needed
npm install -D tsx

# Run migration
npx tsx scripts/migrate-items-placeId.ts
```

**What it does:**
- Scans all items in Firestore
- Fetches the container's placeId for items missing it
- Updates items with the placeId field
- Reports progress and any errors

**Time estimate:** ~1 second per 100 items

### After Migration
Once all items have `placeId`, you can remove the backward compatibility code in `src/services/firebaseService.ts` (search for "TODO: Remove this backward compatibility code").

This will fully eliminate the N+1 query pattern and improve performance.

### Firestore Index
For optimal performance with the new query, ensure you have a composite index:

**Collection:** `items`
**Fields:**
- `placeId` (Ascending)
- `createdAt` (Descending)

Firebase will prompt you to create this index automatically when you first query by placeId.
