# Activity Log Implementation Guide

This guide explains how to implement activity logs for Places, Containers, and Items in Stowaway while following Firebase/Firestore best practices.

## Overview

Activity logs track user actions (create, update, delete, move, scan) across your inventory. This implementation uses a **single top-level activity collection** to avoid the "1MB Document Trap" and enable flexible querying.

---

## Key Benefits

- **No Document Size Issues**: Uses a separate collection instead of arrays within documents
- **Flexible Querying**: Query activity by entity, by type, or globally
- **Cost Efficient**: Uses composite indexes for optimal performance
- **Dashboard Feed**: Show recent activity across all entities
- **Entity History**: Show activity timeline on detail pages
- **Non-Blocking**: Activity logging doesn't break main operations if it fails

---

## Architecture Decision: Single Collection vs Subcollections

### ✅ Recommended: Single Top-Level `activity` Collection

**Structure:**
```
activity/
  {activityId}/
    - userId
    - action (created, updated, deleted, moved, scanned)
    - entityType (place, container, item)
    - entityId
    - entityName (denormalized)
    - metadata (optional context)
    - createdAt
```

**Why This Approach:**
- Query all recent activity across entire inventory (great for dashboard feed)
- Query activity by entity type (`place`, `container`, `item`)
- Query activity for a specific entity
- Simpler to implement and maintain
- Better for analytics and reporting
- Single set of indexes to manage

### ❌ Alternative: Subcollections (When NOT to Use)

**Structure:**
```
places/{placeId}/activity/{activityId}
containers/{containerId}/activity/{activityId}
items/{itemId}/activity/{activityId}
```

**Only use if:**
- You never need cross-entity activity queries
- You want automatic deletion when parent is deleted
- You have VERY high activity volume per entity (millions)

**Downsides:**
- Hard to get "all activity across my inventory"
- Need to query multiple subcollections
- More complex to implement

---

## Implementation Steps

### Step 1: Define Types

Add to `src/types/index.ts`:

```typescript
export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'moved'        // For moving items between containers
  | 'scanned'      // For QR code scans
  | 'viewed'       // Optional: track views

export type ActivityEntityType = 'place' | 'container' | 'item'

export interface Activity {
  id: string
  userId: string

  // What happened
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string
  entityName: string  // Denormalized for display without extra queries

  // Context (optional based on action)
  metadata?: {
    oldValue?: string      // For updates (e.g., old name)
    newValue?: string      // For updates (e.g., new name)
    fromContainerId?: string  // For moves
    toContainerId?: string    // For moves
    changedFields?: string[]  // Array of field names that changed
  }

  // Timestamps
  createdAt: Date
}
```

---

### Step 2: Add Zod Schema

Add to `src/schemas/firestore.ts`:

```typescript
export const ActivitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.enum(['created', 'updated', 'deleted', 'moved', 'scanned', 'viewed']),
  entityType: z.enum(['place', 'container', 'item']),
  entityId: z.string(),
  entityName: z.string(),
  metadata: z.object({
    oldValue: z.string().optional(),
    newValue: z.string().optional(),
    fromContainerId: z.string().optional(),
    toContainerId: z.string().optional(),
    changedFields: z.array(z.string()).optional(),
  }).optional(),
  createdAt: dateOrTimestampSchema,
})

export type ValidatedActivity = z.infer<typeof ActivitySchema>
```

---

### Step 3: Add Service Functions

Add to `src/services/firebaseService.ts`:

```typescript
/**
 * ACTIVITY LOG OPERATIONS
 */

// Helper function to log activity (called internally by CRUD operations)
async function logActivity(
  action: ActivityAction,
  entityType: ActivityEntityType,
  entityId: string,
  entityName: string,
  metadata?: Activity['metadata']
) {
  try {
    const userId = getCurrentUserId();

    await addDoc(collection(db, 'activity'), {
      userId,
      action,
      entityType,
      entityId,
      entityName,
      metadata: metadata || null,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    // Log but don't throw - activity logging shouldn't break main operations
    console.error('Error logging activity:', error);
  }
}

// Get activity for a specific entity
export async function getEntityActivity(
  entityType: ActivityEntityType,
  entityId: string,
  limitCount = 20
): Promise<Activity[]> {
  try {
    const q = query(
      collection(db, 'activity'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() };
      return ActivitySchema.parse(raw);
    });
  } catch (error) {
    console.error('Error fetching entity activity:', error);
    throw error;
  }
}

// Get recent activity for a user (dashboard feed)
export async function getUserRecentActivity(
  userId: string,
  limitCount = 50
): Promise<Activity[]> {
  try {
    const q = query(
      collection(db, 'activity'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() };
      return ActivitySchema.parse(raw);
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw error;
  }
}

// Get activity by type (e.g., all item activities)
export async function getActivityByType(
  userId: string,
  entityType: ActivityEntityType,
  limitCount = 50
): Promise<Activity[]> {
  try {
    const q = query(
      collection(db, 'activity'),
      where('userId', '==', userId),
      where('entityType', '==', entityType),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() };
      return ActivitySchema.parse(raw);
    });
  } catch (error) {
    console.error('Error fetching activity by type:', error);
    throw error;
  }
}
```

---

### Step 4: Integrate Into CRUD Operations

Update existing CRUD functions to log activity:

#### Places

```typescript
// PLACES - Update createPlace
export async function createPlace(place: Omit<Place, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create a place");

    const sanitizedPlace = sanitizeUndefined(place)
    const docRef = await addDoc(collection(db, 'places'), {
      ...sanitizedPlace,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    await linkPendingUploads(docRef.id, 'places', {
      photos: place.photos
    });

    // 🆕 Log activity
    await logActivity('created', 'place', docRef.id, place.name);

    return docRef.id
  } catch (error) {
    console.error('FirebaseService: Error creating place:', error)
    throw error
  }
}

// PLACES - Update updatePlace
export async function updatePlace(placeId: string, updates: Partial<Place>) {
  try {
    const placeRef = doc(db, 'places', placeId);

    // 🆕 Get old data for activity log
    const oldPlace = await getPlace(placeId);

    const sanitizedUpdates = sanitizeUndefined(updates);
    await updateDoc(placeRef, {
      ...sanitizedUpdates,
      updatedAt: Timestamp.now(),
    });

    // 🆕 Log activity with metadata
    if (oldPlace && updates.name && updates.name !== oldPlace.name) {
      await logActivity('updated', 'place', placeId, updates.name, {
        oldValue: oldPlace.name,
        newValue: updates.name,
        changedFields: Object.keys(updates),
      });
    }
  } catch (error) {
    console.error('Error updating place:', error);
    throw error;
  }
}

// PLACES - Update deletePlace
export async function deletePlace(placeId: string) {
  try {
    // 🆕 Get name before deletion
    const place = await getPlace(placeId);

    await deleteDoc(doc(db, 'places', placeId));

    // 🆕 Log activity
    if (place) {
      await logActivity('deleted', 'place', placeId, place.name);
    }
  } catch (error) {
    console.error('Error deleting place:', error);
    throw error;
  }
}
```

#### Items

```typescript
// ITEMS - Update createItem
export async function createItem(item: Omit<Item, 'id' | 'userId' | 'placeId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create an item");

    const container = await getContainer(item.containerId);
    if (!container) throw new Error("Container not found");

    const sanitizedItem = sanitizeUndefined(item)
    const docRef = await addDoc(collection(db, 'items'), {
      ...sanitizedItem,
      userId,
      placeId: container.placeId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    await linkPendingUploads(docRef.id, 'items', {
      photos: item.photos,
      voiceNoteUrl: item.voiceNoteUrl
    });

    // 🆕 Log activity
    await logActivity('created', 'item', docRef.id, item.name);

    return docRef.id
  } catch (error) {
    console.error('Error creating item:', error)
    throw error
  }
}
```

#### Containers - QR Scan Tracking

```typescript
// CONTAINERS - Add QR scan tracking
export async function trackContainerScan(containerId: string) {
  try {
    const container = await getContainer(containerId);
    if (!container) throw new Error("Container not found");

    // Update lastAccessed
    await updateDoc(doc(db, 'containers', containerId), {
      lastAccessed: Timestamp.now(),
    });

    // 🆕 Log scan activity
    await logActivity('scanned', 'container', containerId, container.name);
  } catch (error) {
    console.error('Error tracking container scan:', error);
    throw error;
  }
}
```

**Apply the same pattern to:**
- `updateItem`
- `deleteItem`
- `createContainer`
- `updateContainer`
- `deleteContainer`

---

### Step 5: Create React Query Hooks

Create `src/hooks/queries/useActivity.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import {
  getEntityActivity,
  getUserRecentActivity,
  getActivityByType
} from '@/services/firebaseService';
import { ActivityEntityType } from '@/types';
import { useAuthStore } from '@/store/auth';

export const ACTIVITY_KEYS = {
  all: ['activity'] as const,
  user: (userId: string) => [...ACTIVITY_KEYS.all, 'user', userId] as const,
  entity: (entityType: ActivityEntityType, entityId: string) =>
    [...ACTIVITY_KEYS.all, 'entity', entityType, entityId] as const,
  byType: (userId: string, entityType: ActivityEntityType) =>
    [...ACTIVITY_KEYS.all, 'type', userId, entityType] as const,
};

// Get activity for a specific entity (show on detail pages)
export function useEntityActivity(
  entityType: ActivityEntityType,
  entityId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ACTIVITY_KEYS.entity(entityType, entityId),
    queryFn: () => getEntityActivity(entityType, entityId),
    enabled: options?.enabled !== false && !!entityId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Get recent activity for current user (dashboard feed)
export function useRecentActivity() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ACTIVITY_KEYS.user(user?.uid || ''),
    queryFn: () => getUserRecentActivity(user!.uid),
    enabled: !!user?.uid,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Get activity by type
export function useActivityByType(entityType: ActivityEntityType) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ACTIVITY_KEYS.byType(user?.uid || '', entityType),
    queryFn: () => getActivityByType(user!.uid, entityType),
    enabled: !!user?.uid,
    staleTime: 1000 * 60, // 1 minute
  });
}
```

---

### Step 6: Create UI Component

Create `src/components/ActivityFeed.tsx`:

```typescript
import { Activity } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Edit, Trash2, Move, QrCode, Eye } from 'lucide-react';

interface ActivityFeedProps {
  activities: Activity[];
  showEntity?: boolean; // Show entity name or not
}

export function ActivityFeed({ activities, showEntity = true }: ActivityFeedProps) {
  const getActionIcon = (action: Activity['action']) => {
    switch (action) {
      case 'created': return Plus;
      case 'updated': return Edit;
      case 'deleted': return Trash2;
      case 'moved': return Move;
      case 'scanned': return QrCode;
      case 'viewed': return Eye;
    }
  };

  const getActionColor = (action: Activity['action']) => {
    switch (action) {
      case 'created': return 'text-green-500';
      case 'updated': return 'text-blue-500';
      case 'deleted': return 'text-red-500';
      case 'moved': return 'text-purple-500';
      case 'scanned': return 'text-accent-aqua';
      case 'viewed': return 'text-gray-500';
    }
  };

  const getActionText = (activity: Activity): string => {
    switch (activity.action) {
      case 'created':
        return `Created ${activity.entityType}`;
      case 'updated':
        if (activity.metadata?.oldValue && activity.metadata?.newValue) {
          return `Renamed from "${activity.metadata.oldValue}" to "${activity.metadata.newValue}"`;
        }
        return `Updated ${activity.entityType}`;
      case 'deleted':
        return `Deleted ${activity.entityType}`;
      case 'moved':
        return `Moved ${activity.entityType}`;
      case 'scanned':
        return `Scanned ${activity.entityType}`;
      case 'viewed':
        return `Viewed ${activity.entityType}`;
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-text-tertiary">
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {activities.map((activity) => {
        const Icon = getActionIcon(activity.action);
        const colorClass = getActionColor(activity.action);

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-4 bg-bg-surface rounded-card border border-border-standard"
          >
            <div className={`mt-0.5 ${colorClass}`}>
              <Icon size={18} strokeWidth={2.5} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-text-primary">
                {getActionText(activity)}
                {showEntity && (
                  <span className="font-semibold ml-1">
                    {activity.entityName}
                  </span>
                )}
              </p>

              <p className="font-body text-xs text-text-tertiary mt-1">
                {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

### Step 7: Use in Pages

#### Item Detail Page

Example in `src/pages/Item.tsx`:

```typescript
import { useEntityActivity } from '@/hooks/queries/useActivity';
import { ActivityFeed } from '@/components/ActivityFeed';

export function Item() {
  const { id } = useParams();
  const { data: item } = useItem(id!);
  const { data: activities = [] } = useEntityActivity('item', id!);

  return (
    <div>
      {/* ... existing item details ... */}

      {/* Activity Section */}
      <div className="mt-8">
        <h3 className="font-display text-lg font-bold mb-4">Activity History</h3>
        <ActivityFeed activities={activities} showEntity={false} />
      </div>
    </div>
  );
}
```

#### Dashboard

Example in `src/pages/Dashboard.tsx`:

```typescript
import { useRecentActivity } from '@/hooks/queries/useActivity';
import { ActivityFeed } from '@/components/ActivityFeed';

export function Dashboard() {
  const { data: recentActivity = [] } = useRecentActivity();

  return (
    <div>
      {/* ... existing dashboard content ... */}

      {/* Recent Activity Feed */}
      <div className="mt-12">
        <h2 className="font-display text-xl font-bold mb-4">Recent Activity</h2>
        <ActivityFeed activities={recentActivity} showEntity={true} />
      </div>
    </div>
  );
}
```

---

### Step 8: Create Composite Indexes

Run your app locally and check the browser console. When you first execute the queries, Firebase will show errors with URLs to create indexes.

**Required indexes for the `activity` collection:**

1. **User Activity Feed:**
   - Fields: `userId` (Ascending) + `createdAt` (Descending)

2. **Entity Activity:**
   - Fields: `entityType` (Ascending) + `entityId` (Ascending) + `createdAt` (Descending)

3. **Activity by Type:**
   - Fields: `userId` (Ascending) + `entityType` (Ascending) + `createdAt` (Descending)

**To create:**
1. Run the app locally in development mode
2. Open browser DevTools console
3. Look for Firebase errors with URLs like: `https://console.firebase.google.com/...`
4. Click the URLs to auto-create indexes (literally one click each)
5. Wait 2-5 minutes for indexes to build

---

### Step 9: Update Firestore Security Rules

Add to your `firestore.rules`:

```javascript
match /activity/{activityId} {
  // Users can only read their own activity
  allow read: if request.auth != null &&
    resource.data.userId == request.auth.uid;

  // Users can create activity logs for their own actions
  allow create: if request.auth != null &&
    request.resource.data.userId == request.auth.uid;

  // No updates or deletes allowed
  allow update, delete: if false;
}
```

---

## Performance & Cost Analysis

### Storage Costs
- **Per Activity Log:** ~200-500 bytes
- **10,000 activities:** ~5MB (negligible)
- **No document size issues:** ✅

### Read Costs
- **Dashboard feed:** 1 query for 50 activities
- **Detail page:** 1 query for 20 activities per entity
- **Much cheaper than fetching all items for counts:** ✅

### Write Costs
- **+1 write per CRUD operation**
- **Cost:** ~$0.18 per 100k activities (minimal)
- **Non-blocking:** Logged asynchronously ✅

### Index Requirements
- **3 composite indexes** (created via console)
- **Automatic once created:** ✅

---

## Alternative Approaches

### Option A: Subcollections (Not Recommended)

```
places/{placeId}/activity/{activityId}
containers/{containerId}/activity/{activityId}
items/{itemId}/activity/{activityId}
```

**Only use if:**
- You never need cross-entity activity queries
- You want automatic deletion when parent is deleted
- You have VERY high activity volume per entity (millions)

**Downsides:**
- Hard to get "all activity across my inventory"
- Need to query multiple subcollections
- More complex to implement

### Option B: Hybrid Approach (Overkill)

Write to both subcollections AND top-level collection.

**Pros:**
- Best of both worlds
- Can query per-entity or globally

**Cons:**
- More writes (higher costs)
- More complex to maintain
- Usually not worth it

---

## Testing Checklist

- [ ] Activity logs created when adding items/containers/places
- [ ] Activity logs created when updating entities (with old/new values)
- [ ] Activity logs created when deleting entities
- [ ] Activity logs created when scanning QR codes
- [ ] Dashboard shows recent activity feed
- [ ] Detail pages show entity-specific activity
- [ ] Composite indexes created (check Firebase Console)
- [ ] Security rules prevent unauthorized access
- [ ] Activity logging doesn't break main operations if it fails
- [ ] Activity timestamps display correctly with `formatDistanceToNow`

---

## Maintenance Notes

### Future Enhancements

1. **Pagination:** Add cursor-based pagination for long activity histories
2. **Filtering:** Filter activity by action type (created, updated, etc.)
3. **Search:** Search activity logs by entity name
4. **Cleanup:** Archive or delete old activity logs (e.g., > 90 days)
5. **Analytics:** Track most active entities, peak usage times, etc.

### Monitoring

- Watch Firestore usage in Firebase Console
- Monitor index performance (slow queries)
- Track activity collection size growth
- Review security rule denials

---

## Common Issues

### Issue: Composite index not found

**Error:** `The query requires an index. You can create it here: https://...`

**Solution:** Click the URL to create the index. Wait 2-5 minutes for it to build.

---

### Issue: Activity not showing up

**Possible causes:**
1. Activity logging failed silently (check console errors)
2. Query is using wrong userId or entityId
3. Composite index still building
4. Security rules blocking read access

**Debug steps:**
1. Check browser console for errors
2. Check Firebase Console > Firestore > `activity` collection
3. Verify security rules in Firebase Console
4. Check that indexes are in "Enabled" state

---

### Issue: Too many activity logs

**Solution:** Implement cleanup function:

```typescript
// Delete activity logs older than 90 days
export async function cleanupOldActivity(userId: string) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const q = query(
    collection(db, 'activity'),
    where('userId', '==', userId),
    where('createdAt', '<', Timestamp.fromDate(cutoffDate))
  );

  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}
```

Run this periodically via a Cloud Function or manual cleanup script.

---

## References

- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Composite Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Count Aggregation Queries](https://firebase.google.com/docs/firestore/query-data/aggregation-queries)
