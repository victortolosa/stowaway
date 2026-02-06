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

## Sprint Breakdown

This implementation is divided into 4 sprints. Each sprint builds on the previous one and results in a testable, shippable increment.

### Sprint 1: Foundation (Backend Setup)

**Goal:** Establish the data layer and security rules for activity logging.

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Define Activity types and enums (including `placeId`, `containerId` for hierarchy) | `src/types/index.ts` |
| 1.2 | Add Zod validation schema with hierarchy fields | `src/schemas/firestore.ts` |
| 1.3 | Create `logActivity` helper function with hierarchy parameter | `src/services/firebaseService.ts` |
| 1.4 | Add query functions (`getEntityActivity`, `getUserRecentActivity`, `getActivityByType`) | `src/services/firebaseService.ts` |
| 1.5 | Add aggregation query functions (`getPlaceAggregatedActivity`, `getContainerAggregatedActivity`) | `src/services/firebaseService.ts` |
| 1.6 | Update Firestore security rules | `firestore.rules` |

**Definition of Done:**
- [ ] Types compile without errors
- [ ] Security rules deployed to Firebase
- [ ] Can manually create and query activity documents in Firebase Console

---

### Sprint 2: CRUD Integration

**Goal:** Activity logs are automatically created for ALL entity operations with proper hierarchy fields.

| Task | Description | Files |
|------|-------------|-------|
| 2.1 | Integrate logging into `createPlace`, `updatePlace`, `deletePlace` | `src/services/firebaseService.ts` |
| 2.2 | Integrate logging into `createContainer`, `updateContainer`, `deleteContainer` | `src/services/firebaseService.ts` |
| 2.3 | Integrate logging into `createItem`, `updateItem`, `deleteItem` | `src/services/firebaseService.ts` |
| 2.4 | Add `moveItem` function with activity logging | `src/services/firebaseService.ts` |
| 2.5 | Add `moveContainer` function with activity logging | `src/services/firebaseService.ts` |
| 2.6 | Add `groupItems` function with activity logging | `src/services/firebaseService.ts` |
| 2.7 | Add `ungroupItems` function with activity logging | `src/services/firebaseService.ts` |
| 2.8 | Add `trackContainerScan` function for QR code scans | `src/services/firebaseService.ts` |
| 2.9 | Add `trackEntityView` function with throttling | `src/services/firebaseService.ts` |
| 2.10 | Add `updateLastViewed` helper for entity field approach | `src/services/firebaseService.ts` |
| 2.11 | Add `lastViewedAt` field to Place, Container, Item types | `src/types/index.ts` |
| 2.12 | Verify all activity types in Firebase Console | Manual testing |

**Definition of Done:**
- [ ] `created` logged when adding places/containers/items
- [ ] `added_to` logged on parent when child is created
- [ ] `renamed` logged when name changes (with old/new values)
- [ ] `updated` logged when other fields change (with changedFields list)
- [ ] `deleted` logged when entities are removed
- [ ] `removed_from` logged on parent when child is deleted
- [ ] `moved` logged when items/containers change parents
- [ ] `grouped` logged when items are grouped together
- [ ] `ungrouped` logged when a group is dissolved
- [ ] `scanned` logged when QR codes are scanned
- [ ] `viewed` logged when detail pages are opened (with throttling)
- [ ] `lastViewedAt` field updated on entities when viewed
- [ ] All activity logs have correct `placeId` and `containerId` for aggregation
- [ ] Main operations still work if activity logging fails

---

### Sprint 3: Frontend Integration

**Goal:** Users can view an "All Activity" feed that filters down by scope.

| Task | Description | Files |
|------|-------------|-------|
| 3.1 | Create React Query hooks for all activity queries | `src/hooks/queries/useActivity.ts` |
| 3.2 | Create hooks for scoped queries (`usePlaceAggregatedActivity`, `useContainerAggregatedActivity`) | `src/hooks/queries/useActivity.ts` |
| 3.3 | Build `ActivityFeed` UI component with all action type support | `src/components/ActivityFeed.tsx` |
| 3.4 | Add "All Activity" feed to Dashboard (unfiltered view) | `src/pages/Dashboard.tsx` |
| 3.5 | Add scoped activity to Place detail page (place + container + item activity) | `src/pages/Place.tsx` |
| 3.6 | Add scoped activity to Container detail page (container + item activity) | `src/pages/Container.tsx` |
| 3.7 | Add scoped activity to Item detail page (item activity only) | `src/pages/Item.tsx` |
| 3.8 | Integrate view tracking into all detail pages | `src/pages/*.tsx` |
| 3.9 | Add "Recently Viewed" section to Dashboard (optional) | `src/pages/Dashboard.tsx` |
| 3.10 | Create required composite indexes in Firebase | Firebase Console |

**Definition of Done:**
- [ ] Dashboard shows "All Activity" feed for the user
- [ ] Place page shows activity scoped to that place and its contents
- [ ] Container page shows activity scoped to that container and its items
- [ ] Item page shows activity scoped to that specific item
- [ ] All action types display with appropriate icons and descriptions
- [ ] Move activities show source and destination names
- [ ] Activity timestamps display as "X minutes ago" format
- [ ] All composite indexes are enabled in Firebase Console

---

### Sprint 4: Testing & Polish

**Goal:** Ensure reliability and handle edge cases.

| Task | Description | Files |
|------|-------------|-------|
| 4.1 | Test all CRUD operations generate correct activity logs | Manual + Unit tests |
| 4.2 | Test security rules prevent unauthorized access | Firebase emulator |
| 4.3 | Test activity logging failure doesn't break main operations | Unit tests |
| 4.4 | Add empty state for activity feeds | `src/components/ActivityFeed.tsx` |
| 4.5 | Add loading states for activity queries | Various pages |
| 4.6 | Document any edge cases discovered | This document |

**Definition of Done:**
- [ ] All items from Testing Checklist pass
- [ ] No console errors during normal usage
- [ ] Activity feed displays gracefully with 0 items
- [ ] Loading states show while fetching activity

---

### Future Sprints (Backlog)

These items are out of scope for the initial implementation but can be prioritized later:

| Item | Description | Priority |
|------|-------------|----------|
| Pagination | Cursor-based pagination for long activity histories | Medium |
| Filtering | Filter activity by action type (created, updated, etc.) | Low |
| Search | Search activity logs by entity name | Low |
| Cleanup | Archive or delete activity logs older than 90 days | Medium |
| Analytics | Track most active entities, peak usage times | Low |

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

## All Activity View with Scoped Filtering

The activity system is designed around a single **"All Activity"** feed that can be filtered down to any scope:

```
┌─────────────────────────────────────────────────────────────┐
│  ALL ACTIVITY (Dashboard)                                   │
│  └── Shows everything: places, containers, items            │
│      Query: WHERE userId == currentUser                     │
├─────────────────────────────────────────────────────────────┤
│  PLACE SCOPE (Place Detail Page)                            │
│  └── Shows: place edits + containers + items within         │
│      Query: WHERE placeId == selectedPlace                  │
├─────────────────────────────────────────────────────────────┤
│  CONTAINER SCOPE (Container Detail Page)                    │
│  └── Shows: container edits + items within                  │
│      Query: WHERE containerId == selectedContainer          │
├─────────────────────────────────────────────────────────────┤
│  ITEM SCOPE (Item Detail Page)                              │
│  └── Shows: only this item's activity                       │
│      Query: WHERE entityType == 'item' AND entityId == id   │
└─────────────────────────────────────────────────────────────┘
```

This approach means:
- **One data model** serves all views
- **Progressively narrow** the scope as you drill down
- **No duplicate queries** - just add filters to the base query
- **Flexible UI** - could add filter chips for action types (created, moved, deleted, etc.)

---

## Activity Aggregation Behavior

Activity logs support hierarchical aggregation, meaning parent entities show activity from their children:

| Entity Level | What Activity is Shown |
|--------------|------------------------|
| **Place** | Place edits + all Container activity + all Item activity within |
| **Container** | Container edits + all Item activity within |
| **Item** | Item activity only (no children) |

### How It Works

Each activity log stores hierarchy fields that enable aggregation:

```
Activity Log for an Item:
├── entityType: "item"
├── entityId: "item123"
├── placeId: "place456"      ← Enables place-level aggregation
└── containerId: "cont789"   ← Enables container-level aggregation
```

**Query Examples:**
- **Place page** queries: `WHERE placeId == "place456"` → Gets all activity
- **Container page** queries: `WHERE containerId == "cont789"` → Gets container + item activity
- **Item page** queries: `WHERE entityType == "item" AND entityId == "item123"` → Gets item activity only

---

## Implementation Steps

### Step 1: Define Types

Add to `src/types/index.ts`:

```typescript
export type ActivityAction =
  | 'created'
  | 'updated'       // General updates (description, photos, etc.)
  | 'renamed'       // Specifically for name changes
  | 'deleted'
  | 'moved'         // For moving items between containers or containers between places
  | 'added_to'      // Item/container added TO this entity (logged on parent)
  | 'removed_from'  // Item/container removed FROM this entity (logged on parent)
  | 'grouped'       // Items grouped together into a new group/bundle
  | 'ungrouped'     // Items ungrouped/separated from a group
  | 'scanned'       // For QR code scans
  | 'viewed'        // Optional: track views

export type ActivityEntityType = 'place' | 'container' | 'item'

export interface Activity {
  id: string
  userId: string

  // What happened
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string
  entityName: string  // Denormalized for display without extra queries

  // Hierarchy fields for aggregation queries
  // These enable querying all activity within a place or container
  placeId?: string      // Set for place, container, AND item activities
  containerId?: string  // Set for container AND item activities

  // Context (optional based on action)
  metadata?: {
    // For renames and field updates
    oldValue?: string           // Previous value (e.g., old name)
    newValue?: string           // New value (e.g., new name)
    changedFields?: string[]    // Array of field names that changed

    // For item moves between containers
    fromContainerId?: string    // Source container ID
    fromContainerName?: string  // Source container name (denormalized)
    toContainerId?: string      // Destination container ID
    toContainerName?: string    // Destination container name (denormalized)

    // For container moves between places
    fromPlaceId?: string        // Source place ID
    fromPlaceName?: string      // Source place name (denormalized)
    toPlaceId?: string          // Destination place ID
    toPlaceName?: string        // Destination place name (denormalized)

    // For added_to/removed_from actions (logged on parent entity)
    childEntityType?: 'container' | 'item'  // What type was added/removed
    childEntityId?: string      // ID of the child entity
    childEntityName?: string    // Name of the child entity

    // For grouped/ungrouped actions
    groupName?: string          // Name of the group created/dissolved
    groupId?: string            // ID of the group
    itemIds?: string[]          // IDs of items in the group
    itemNames?: string[]        // Names of items in the group (denormalized)
    itemCount?: number          // Number of items grouped/ungrouped
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
  action: z.enum(['created', 'updated', 'renamed', 'deleted', 'moved', 'added_to', 'removed_from', 'grouped', 'ungrouped', 'scanned', 'viewed']),
  entityType: z.enum(['place', 'container', 'item']),
  entityId: z.string(),
  entityName: z.string(),
  // Hierarchy fields for aggregation
  placeId: z.string().optional(),
  containerId: z.string().optional(),
  metadata: z.object({
    // For renames and field updates
    oldValue: z.string().optional(),
    newValue: z.string().optional(),
    changedFields: z.array(z.string()).optional(),
    // For item moves between containers
    fromContainerId: z.string().optional(),
    fromContainerName: z.string().optional(),
    toContainerId: z.string().optional(),
    toContainerName: z.string().optional(),
    // For container moves between places
    fromPlaceId: z.string().optional(),
    fromPlaceName: z.string().optional(),
    toPlaceId: z.string().optional(),
    toPlaceName: z.string().optional(),
    // For added_to/removed_from actions
    childEntityType: z.enum(['container', 'item']).optional(),
    childEntityId: z.string().optional(),
    childEntityName: z.string().optional(),
    // For grouped/ungrouped actions
    groupName: z.string().optional(),
    groupId: z.string().optional(),
    itemIds: z.array(z.string()).optional(),
    itemNames: z.array(z.string()).optional(),
    itemCount: z.number().optional(),
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
// placeId and containerId enable hierarchical aggregation queries
async function logActivity(
  action: ActivityAction,
  entityType: ActivityEntityType,
  entityId: string,
  entityName: string,
  hierarchy: {
    placeId?: string      // Required for place, container, and item activities
    containerId?: string  // Required for container and item activities
  },
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
      placeId: hierarchy.placeId || null,
      containerId: hierarchy.containerId || null,
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

// Get ALL activity within a place (place + its containers + their items)
export async function getPlaceAggregatedActivity(
  placeId: string,
  limitCount = 50
): Promise<Activity[]> {
  try {
    const q = query(
      collection(db, 'activity'),
      where('placeId', '==', placeId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() };
      return ActivitySchema.parse(raw);
    });
  } catch (error) {
    console.error('Error fetching place aggregated activity:', error);
    throw error;
  }
}

// Get ALL activity within a container (container + its items)
export async function getContainerAggregatedActivity(
  containerId: string,
  limitCount = 50
): Promise<Activity[]> {
  try {
    const q = query(
      collection(db, 'activity'),
      where('containerId', '==', containerId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() };
      return ActivitySchema.parse(raw);
    });
  } catch (error) {
    console.error('Error fetching container aggregated activity:', error);
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

    // 🆕 Log activity (place activity includes placeId for aggregation)
    await logActivity('created', 'place', docRef.id, place.name, {
      placeId: docRef.id,  // Place's own ID for self-referential aggregation
    });

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
    if (!oldPlace) throw new Error("Place not found");

    const sanitizedUpdates = sanitizeUndefined(updates);
    await updateDoc(placeRef, {
      ...sanitizedUpdates,
      updatedAt: Timestamp.now(),
    });

    // 🆕 Log activity - track ALL changes
    const changedFields = Object.keys(updates);
    const currentName = updates.name || oldPlace.name;

    // Check if this is specifically a rename
    if (updates.name && updates.name !== oldPlace.name) {
      await logActivity('renamed', 'place', placeId, currentName, {
        placeId: placeId,
      }, {
        oldValue: oldPlace.name,
        newValue: updates.name,
        changedFields,
      });
    } else if (changedFields.length > 0) {
      // Log other updates (description, photos, etc.)
      await logActivity('updated', 'place', placeId, currentName, {
        placeId: placeId,
      }, {
        changedFields,
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
      await logActivity('deleted', 'place', placeId, place.name, {
        placeId: placeId,
      });
    }
  } catch (error) {
    console.error('Error deleting place:', error);
    throw error;
  }
}
```

#### Containers

```typescript
// CONTAINERS - Create container
export async function createContainer(container: Omit<Container, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create a container");

    const place = await getPlace(container.placeId);
    if (!place) throw new Error("Place not found");

    const sanitizedContainer = sanitizeUndefined(container);
    const docRef = await addDoc(collection(db, 'containers'), {
      ...sanitizedContainer,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // 🆕 Log activity on the container itself
    await logActivity('created', 'container', docRef.id, container.name, {
      placeId: container.placeId,
      containerId: docRef.id,
    });

    // 🆕 Log activity on the parent place (container was added to it)
    await logActivity('added_to', 'place', container.placeId, place.name, {
      placeId: container.placeId,
    }, {
      childEntityType: 'container',
      childEntityId: docRef.id,
      childEntityName: container.name,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating container:', error);
    throw error;
  }
}

// CONTAINERS - Update container
export async function updateContainer(containerId: string, updates: Partial<Container>) {
  try {
    const containerRef = doc(db, 'containers', containerId);

    // 🆕 Get old data for activity log
    const oldContainer = await getContainer(containerId);
    if (!oldContainer) throw new Error("Container not found");

    const sanitizedUpdates = sanitizeUndefined(updates);
    await updateDoc(containerRef, {
      ...sanitizedUpdates,
      updatedAt: Timestamp.now(),
    });

    // 🆕 Log activity - track ALL changes
    const changedFields = Object.keys(updates);
    const currentName = updates.name || oldContainer.name;

    // Check if this is specifically a rename
    if (updates.name && updates.name !== oldContainer.name) {
      await logActivity('renamed', 'container', containerId, currentName, {
        placeId: oldContainer.placeId,
        containerId: containerId,
      }, {
        oldValue: oldContainer.name,
        newValue: updates.name,
        changedFields,
      });
    } else if (changedFields.length > 0) {
      // Log other updates (description, photos, etc.)
      await logActivity('updated', 'container', containerId, currentName, {
        placeId: oldContainer.placeId,
        containerId: containerId,
      }, {
        changedFields,
      });
    }
  } catch (error) {
    console.error('Error updating container:', error);
    throw error;
  }
}

// CONTAINERS - Delete container
export async function deleteContainer(containerId: string) {
  try {
    // 🆕 Get container and place info before deletion
    const container = await getContainer(containerId);
    if (!container) throw new Error("Container not found");

    const place = await getPlace(container.placeId);

    await deleteDoc(doc(db, 'containers', containerId));

    // 🆕 Log activity on the container itself
    await logActivity('deleted', 'container', containerId, container.name, {
      placeId: container.placeId,
      containerId: containerId,
    });

    // 🆕 Log activity on the parent place (container was removed from it)
    if (place) {
      await logActivity('removed_from', 'place', container.placeId, place.name, {
        placeId: container.placeId,
      }, {
        childEntityType: 'container',
        childEntityId: containerId,
        childEntityName: container.name,
      });
    }
  } catch (error) {
    console.error('Error deleting container:', error);
    throw error;
  }
}

// CONTAINERS - Move container to a different place
export async function moveContainer(containerId: string, newPlaceId: string) {
  try {
    const container = await getContainer(containerId);
    if (!container) throw new Error("Container not found");

    const oldPlace = await getPlace(container.placeId);
    const newPlace = await getPlace(newPlaceId);
    if (!newPlace) throw new Error("Destination place not found");

    const oldPlaceId = container.placeId;

    // Update the container's placeId
    await updateDoc(doc(db, 'containers', containerId), {
      placeId: newPlaceId,
      updatedAt: Timestamp.now(),
    });

    // Also update all items in this container to the new placeId
    const items = await getItemsByContainer(containerId);
    for (const item of items) {
      await updateDoc(doc(db, 'items', item.id), {
        placeId: newPlaceId,
        updatedAt: Timestamp.now(),
      });
    }

    // 🆕 Log 'moved' activity on the container
    await logActivity('moved', 'container', containerId, container.name, {
      placeId: newPlaceId,  // Update to new place for aggregation
      containerId: containerId,
    }, {
      fromPlaceId: oldPlaceId,
      fromPlaceName: oldPlace?.name,
      toPlaceId: newPlaceId,
      toPlaceName: newPlace.name,
    });

    // 🆕 Log 'removed_from' on the old place
    if (oldPlace) {
      await logActivity('removed_from', 'place', oldPlaceId, oldPlace.name, {
        placeId: oldPlaceId,
      }, {
        childEntityType: 'container',
        childEntityId: containerId,
        childEntityName: container.name,
      });
    }

    // 🆕 Log 'added_to' on the new place
    await logActivity('added_to', 'place', newPlaceId, newPlace.name, {
      placeId: newPlaceId,
    }, {
      childEntityType: 'container',
      childEntityId: containerId,
      childEntityName: container.name,
    });
  } catch (error) {
    console.error('Error moving container:', error);
    throw error;
  }
}
```

#### Items

```typescript
// ITEMS - Create item
export async function createItem(item: Omit<Item, 'id' | 'userId' | 'placeId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create an item");

    const container = await getContainer(item.containerId);
    if (!container) throw new Error("Container not found");

    const sanitizedItem = sanitizeUndefined(item);
    const docRef = await addDoc(collection(db, 'items'), {
      ...sanitizedItem,
      userId,
      placeId: container.placeId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await linkPendingUploads(docRef.id, 'items', {
      photos: item.photos,
      voiceNoteUrl: item.voiceNoteUrl
    });

    // 🆕 Log activity on the item itself
    await logActivity('created', 'item', docRef.id, item.name, {
      placeId: container.placeId,
      containerId: item.containerId,
    });

    // 🆕 Log activity on the parent container (item was added to it)
    await logActivity('added_to', 'container', item.containerId, container.name, {
      placeId: container.placeId,
      containerId: item.containerId,
    }, {
      childEntityType: 'item',
      childEntityId: docRef.id,
      childEntityName: item.name,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
}

// ITEMS - Update item
export async function updateItem(itemId: string, updates: Partial<Item>) {
  try {
    const itemRef = doc(db, 'items', itemId);

    // 🆕 Get old data for activity log
    const oldItem = await getItem(itemId);
    if (!oldItem) throw new Error("Item not found");

    const sanitizedUpdates = sanitizeUndefined(updates);
    await updateDoc(itemRef, {
      ...sanitizedUpdates,
      updatedAt: Timestamp.now(),
    });

    // 🆕 Log activity - track ALL changes
    const changedFields = Object.keys(updates);
    const currentName = updates.name || oldItem.name;

    // Check if this is specifically a rename
    if (updates.name && updates.name !== oldItem.name) {
      await logActivity('renamed', 'item', itemId, currentName, {
        placeId: oldItem.placeId,
        containerId: oldItem.containerId,
      }, {
        oldValue: oldItem.name,
        newValue: updates.name,
        changedFields,
      });
    } else if (changedFields.length > 0) {
      // Log other updates (description, photos, quantity, etc.)
      await logActivity('updated', 'item', itemId, currentName, {
        placeId: oldItem.placeId,
        containerId: oldItem.containerId,
      }, {
        changedFields,
      });
    }
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
}

// ITEMS - Delete item
export async function deleteItem(itemId: string) {
  try {
    // 🆕 Get item and container info before deletion
    const item = await getItem(itemId);
    if (!item) throw new Error("Item not found");

    const container = await getContainer(item.containerId);

    await deleteDoc(doc(db, 'items', itemId));

    // 🆕 Log activity on the item itself
    await logActivity('deleted', 'item', itemId, item.name, {
      placeId: item.placeId,
      containerId: item.containerId,
    });

    // 🆕 Log activity on the parent container (item was removed from it)
    if (container) {
      await logActivity('removed_from', 'container', item.containerId, container.name, {
        placeId: item.placeId,
        containerId: item.containerId,
      }, {
        childEntityType: 'item',
        childEntityId: itemId,
        childEntityName: item.name,
      });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
}

// ITEMS - Move item to a different container
export async function moveItem(itemId: string, newContainerId: string) {
  try {
    const item = await getItem(itemId);
    if (!item) throw new Error("Item not found");

    const oldContainer = await getContainer(item.containerId);
    const newContainer = await getContainer(newContainerId);
    if (!newContainer) throw new Error("Destination container not found");

    const oldContainerId = item.containerId;
    const oldPlaceId = item.placeId;

    // Update the item's containerId (and placeId if container is in different place)
    await updateDoc(doc(db, 'items', itemId), {
      containerId: newContainerId,
      placeId: newContainer.placeId,
      updatedAt: Timestamp.now(),
    });

    // 🆕 Log 'moved' activity on the item
    await logActivity('moved', 'item', itemId, item.name, {
      placeId: newContainer.placeId,  // Update to new place for aggregation
      containerId: newContainerId,     // Update to new container for aggregation
    }, {
      fromContainerId: oldContainerId,
      fromContainerName: oldContainer?.name,
      toContainerId: newContainerId,
      toContainerName: newContainer.name,
    });

    // 🆕 Log 'removed_from' on the old container
    if (oldContainer) {
      await logActivity('removed_from', 'container', oldContainerId, oldContainer.name, {
        placeId: oldPlaceId,
        containerId: oldContainerId,
      }, {
        childEntityType: 'item',
        childEntityId: itemId,
        childEntityName: item.name,
      });
    }

    // 🆕 Log 'added_to' on the new container
    await logActivity('added_to', 'container', newContainerId, newContainer.name, {
      placeId: newContainer.placeId,
      containerId: newContainerId,
    }, {
      childEntityType: 'item',
      childEntityId: itemId,
      childEntityName: item.name,
    });
  } catch (error) {
    console.error('Error moving item:', error);
    throw error;
  }
}

// ITEMS - Group multiple items together
export async function groupItems(
  itemIds: string[],
  groupName: string,
  containerId: string
) {
  try {
    if (itemIds.length < 2) throw new Error("Need at least 2 items to group");

    const container = await getContainer(containerId);
    if (!container) throw new Error("Container not found");

    // Get all items to be grouped
    const items = await Promise.all(itemIds.map(id => getItem(id)));
    const validItems = items.filter(Boolean) as Item[];
    const itemNames = validItems.map(item => item.name);

    // Create the group (implementation depends on your data model)
    // This could be a new "group" entity or a field on items
    const groupId = await createItemGroup({
      name: groupName,
      itemIds,
      containerId,
      placeId: container.placeId,
    });

    // 🆕 Log 'grouped' activity
    await logActivity('grouped', 'item', groupId, groupName, {
      placeId: container.placeId,
      containerId: containerId,
    }, {
      groupName,
      groupId,
      itemIds,
      itemNames,
      itemCount: itemIds.length,
    });

    // 🆕 Log on each item that it was grouped
    for (const item of validItems) {
      await logActivity('grouped', 'item', item.id, item.name, {
        placeId: item.placeId,
        containerId: item.containerId,
      }, {
        groupName,
        groupId,
        itemCount: itemIds.length,
      });
    }

    // 🆕 Log on the container that items were grouped
    await logActivity('grouped', 'container', containerId, container.name, {
      placeId: container.placeId,
      containerId: containerId,
    }, {
      groupName,
      groupId,
      itemNames,
      itemCount: itemIds.length,
    });

    return groupId;
  } catch (error) {
    console.error('Error grouping items:', error);
    throw error;
  }
}

// ITEMS - Ungroup items (dissolve a group)
export async function ungroupItems(groupId: string) {
  try {
    const group = await getItemGroup(groupId);
    if (!group) throw new Error("Group not found");

    const container = await getContainer(group.containerId);

    // Get all items in the group
    const items = await Promise.all(group.itemIds.map(id => getItem(id)));
    const validItems = items.filter(Boolean) as Item[];
    const itemNames = validItems.map(item => item.name);

    // Delete the group (implementation depends on your data model)
    await deleteItemGroup(groupId);

    // 🆕 Log 'ungrouped' activity on the group
    await logActivity('ungrouped', 'item', groupId, group.name, {
      placeId: group.placeId,
      containerId: group.containerId,
    }, {
      groupName: group.name,
      groupId,
      itemIds: group.itemIds,
      itemNames,
      itemCount: group.itemIds.length,
    });

    // 🆕 Log on each item that it was ungrouped
    for (const item of validItems) {
      await logActivity('ungrouped', 'item', item.id, item.name, {
        placeId: item.placeId,
        containerId: item.containerId,
      }, {
        groupName: group.name,
        groupId,
      });
    }

    // 🆕 Log on the container that items were ungrouped
    if (container) {
      await logActivity('ungrouped', 'container', group.containerId, container.name, {
        placeId: group.placeId,
        containerId: group.containerId,
      }, {
        groupName: group.name,
        groupId,
        itemNames,
        itemCount: group.itemIds.length,
      });
    }
  } catch (error) {
    console.error('Error ungrouping items:', error);
    throw error;
  }
}
```

#### Tracking Views (Last Viewed)

There are two approaches for tracking views - you can use one or both:

**Approach A: Activity Log (View History)**
Logs each view as an activity entry. Good for seeing "when was this last viewed" and view history.

```typescript
// Track when an entity is viewed (call from detail page useEffect)
export async function trackEntityView(
  entityType: ActivityEntityType,
  entityId: string,
  options?: { throttleMinutes?: number }
) {
  try {
    const throttleMinutes = options?.throttleMinutes ?? 5; // Default 5 min throttle

    // Optional: Check if we recently logged a view to avoid spam
    if (throttleMinutes > 0) {
      const recentView = await getRecentViewActivity(entityType, entityId, throttleMinutes);
      if (recentView) return; // Skip if viewed recently
    }

    // Get entity details for hierarchy
    let hierarchy: { placeId?: string; containerId?: string } = {};
    let entityName = '';

    if (entityType === 'place') {
      const place = await getPlace(entityId);
      if (!place) return;
      entityName = place.name;
      hierarchy = { placeId: entityId };
    } else if (entityType === 'container') {
      const container = await getContainer(entityId);
      if (!container) return;
      entityName = container.name;
      hierarchy = { placeId: container.placeId, containerId: entityId };
    } else if (entityType === 'item') {
      const item = await getItem(entityId);
      if (!item) return;
      entityName = item.name;
      hierarchy = { placeId: item.placeId, containerId: item.containerId };
    }

    await logActivity('viewed', entityType, entityId, entityName, hierarchy);
  } catch (error) {
    // Silent fail - view tracking shouldn't break the app
    console.error('Error tracking view:', error);
  }
}

// Helper to check for recent view (for throttling)
async function getRecentViewActivity(
  entityType: ActivityEntityType,
  entityId: string,
  withinMinutes: number
): Promise<boolean> {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - withinMinutes);

  const q = query(
    collection(db, 'activity'),
    where('userId', '==', userId),
    where('entityType', '==', entityType),
    where('entityId', '==', entityId),
    where('action', '==', 'viewed'),
    where('createdAt', '>=', Timestamp.fromDate(cutoff)),
    limit(1)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}
```

**Approach B: Entity Field (Quick Lookup)**
Updates a `lastViewedAt` field directly on the entity. Good for sorting by "recently viewed".

```typescript
// Update lastViewedAt on the entity itself
export async function updateLastViewed(
  entityType: ActivityEntityType,
  entityId: string
) {
  try {
    const collectionName = entityType === 'place' ? 'places' :
                           entityType === 'container' ? 'containers' : 'items';

    await updateDoc(doc(db, collectionName, entityId), {
      lastViewedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating lastViewedAt:', error);
  }
}
```

**Using in React (Detail Page)**

```typescript
// In Place.tsx, Container.tsx, or Item.tsx
import { useEffect } from 'react';
import { trackEntityView, updateLastViewed } from '@/services/firebaseService';

export function ItemDetail() {
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      // Track view in activity log (throttled to 5 min)
      trackEntityView('item', id, { throttleMinutes: 5 });

      // Also update lastViewedAt on the entity
      updateLastViewed('item', id);
    }
  }, [id]);

  // ... rest of component
}
```

**Querying Recently Viewed Entities**

```typescript
// Get user's recently viewed items (using entity field approach)
export async function getRecentlyViewedItems(userId: string, limitCount = 10): Promise<Item[]> {
  const q = query(
    collection(db, 'items'),
    where('userId', '==', userId),
    where('lastViewedAt', '!=', null),
    orderBy('lastViewedAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
}
```

**Which Approach to Use?**

| Use Case | Recommended Approach |
|----------|---------------------|
| "Show recently viewed items" list | Entity field (`lastViewedAt`) |
| "When did I last look at this?" | Activity log (`viewed` action) |
| "Show view history timeline" | Activity log |
| "Sort items by last viewed" | Entity field |
| Both use cases | Use both approaches |

**Note:** View tracking can generate a lot of activity logs. The throttle parameter prevents spam when users refresh pages or navigate back and forth. Adjust `throttleMinutes` based on your needs (0 = log every view).

---

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

    // 🆕 Log scan activity (containers include placeId AND containerId for aggregation)
    await logActivity('scanned', 'container', containerId, container.name, {
      placeId: container.placeId,    // Enables place-level aggregation
      containerId: containerId,       // Enables container-level aggregation
    });
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
  getActivityByType,
  getPlaceAggregatedActivity,
  getContainerAggregatedActivity,
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
  // Aggregation keys
  placeAggregated: (placeId: string) =>
    [...ACTIVITY_KEYS.all, 'place-aggregated', placeId] as const,
  containerAggregated: (containerId: string) =>
    [...ACTIVITY_KEYS.all, 'container-aggregated', containerId] as const,
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

// Get ALL activity within a place (place edits + container activity + item activity)
export function usePlaceAggregatedActivity(
  placeId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ACTIVITY_KEYS.placeAggregated(placeId),
    queryFn: () => getPlaceAggregatedActivity(placeId),
    enabled: options?.enabled !== false && !!placeId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Get ALL activity within a container (container edits + item activity)
export function useContainerAggregatedActivity(
  containerId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ACTIVITY_KEYS.containerAggregated(containerId),
    queryFn: () => getContainerAggregatedActivity(containerId),
    enabled: options?.enabled !== false && !!containerId,
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
import {
  Plus,
  Edit,
  Trash2,
  Move,
  QrCode,
  Eye,
  Type,        // For rename
  LogIn,       // For added_to
  LogOut,      // For removed_from
  Group,       // For grouped
  Ungroup,     // For ungrouped
} from 'lucide-react';

interface ActivityFeedProps {
  activities: Activity[];
  showEntity?: boolean; // Show entity name or not
}

export function ActivityFeed({ activities, showEntity = true }: ActivityFeedProps) {
  const getActionIcon = (action: Activity['action']) => {
    switch (action) {
      case 'created': return Plus;
      case 'updated': return Edit;
      case 'renamed': return Type;
      case 'deleted': return Trash2;
      case 'moved': return Move;
      case 'added_to': return LogIn;
      case 'removed_from': return LogOut;
      case 'grouped': return Group;
      case 'ungrouped': return Ungroup;
      case 'scanned': return QrCode;
      case 'viewed': return Eye;
    }
  };

  const getActionColor = (action: Activity['action']) => {
    switch (action) {
      case 'created': return 'text-green-500';
      case 'updated': return 'text-blue-500';
      case 'renamed': return 'text-amber-500';
      case 'deleted': return 'text-red-500';
      case 'moved': return 'text-purple-500';
      case 'added_to': return 'text-green-400';
      case 'removed_from': return 'text-orange-500';
      case 'grouped': return 'text-indigo-500';
      case 'ungrouped': return 'text-pink-500';
      case 'scanned': return 'text-accent-aqua';
      case 'viewed': return 'text-gray-500';
    }
  };

  const getActionText = (activity: Activity): string => {
    const meta = activity.metadata;

    switch (activity.action) {
      case 'created':
        return `Created ${activity.entityType}`;

      case 'updated':
        if (meta?.changedFields?.length) {
          return `Updated ${meta.changedFields.join(', ')}`;
        }
        return `Updated ${activity.entityType}`;

      case 'renamed':
        if (meta?.oldValue && meta?.newValue) {
          return `Renamed from "${meta.oldValue}" to "${meta.newValue}"`;
        }
        return `Renamed ${activity.entityType}`;

      case 'deleted':
        return `Deleted ${activity.entityType}`;

      case 'moved':
        // Item moved between containers
        if (meta?.fromContainerName && meta?.toContainerName) {
          return `Moved from "${meta.fromContainerName}" to "${meta.toContainerName}"`;
        }
        // Container moved between places
        if (meta?.fromPlaceName && meta?.toPlaceName) {
          return `Moved from "${meta.fromPlaceName}" to "${meta.toPlaceName}"`;
        }
        return `Moved ${activity.entityType}`;

      case 'added_to':
        if (meta?.childEntityName && meta?.childEntityType) {
          return `${meta.childEntityType} "${meta.childEntityName}" added`;
        }
        return `${activity.entityType} received new content`;

      case 'removed_from':
        if (meta?.childEntityName && meta?.childEntityType) {
          return `${meta.childEntityType} "${meta.childEntityName}" removed`;
        }
        return `Content removed from ${activity.entityType}`;

      case 'grouped':
        if (meta?.groupName && meta?.itemCount) {
          return `Grouped ${meta.itemCount} items into "${meta.groupName}"`;
        }
        if (meta?.groupName) {
          return `Added to group "${meta.groupName}"`;
        }
        return `Items grouped`;

      case 'ungrouped':
        if (meta?.groupName && meta?.itemCount) {
          return `Ungrouped ${meta.itemCount} items from "${meta.groupName}"`;
        }
        if (meta?.groupName) {
          return `Removed from group "${meta.groupName}"`;
        }
        return `Items ungrouped`;

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

#### Place Detail Page (Aggregated Activity)

Example in `src/pages/Place.tsx`:

```typescript
import { usePlaceAggregatedActivity } from '@/hooks/queries/useActivity';
import { ActivityFeed } from '@/components/ActivityFeed';

export function Place() {
  const { id } = useParams();
  const { data: place } = usePlace(id!);
  // 🆕 Gets ALL activity: place edits + container activity + item activity
  const { data: activities = [] } = usePlaceAggregatedActivity(id!);

  return (
    <div>
      {/* ... existing place details ... */}

      {/* Activity Section - Shows activity across the entire place hierarchy */}
      <div className="mt-8">
        <h3 className="font-display text-lg font-bold mb-4">Activity History</h3>
        <p className="text-sm text-text-secondary mb-4">
          Activity from this place and all its containers and items
        </p>
        <ActivityFeed activities={activities} showEntity={true} />
      </div>
    </div>
  );
}
```

#### Container Detail Page (Aggregated Activity)

Example in `src/pages/Container.tsx`:

```typescript
import { useContainerAggregatedActivity } from '@/hooks/queries/useActivity';
import { ActivityFeed } from '@/components/ActivityFeed';

export function Container() {
  const { id } = useParams();
  const { data: container } = useContainer(id!);
  // 🆕 Gets ALL activity: container edits + item activity within this container
  const { data: activities = [] } = useContainerAggregatedActivity(id!);

  return (
    <div>
      {/* ... existing container details ... */}

      {/* Activity Section - Shows activity for container and its items */}
      <div className="mt-8">
        <h3 className="font-display text-lg font-bold mb-4">Activity History</h3>
        <p className="text-sm text-text-secondary mb-4">
          Activity from this container and all its items
        </p>
        <ActivityFeed activities={activities} showEntity={true} />
      </div>
    </div>
  );
}
```

#### Item Detail Page (Entity-Specific Activity)

Example in `src/pages/Item.tsx`:

```typescript
import { useEntityActivity } from '@/hooks/queries/useActivity';
import { ActivityFeed } from '@/components/ActivityFeed';

export function Item() {
  const { id } = useParams();
  const { data: item } = useItem(id!);
  // Items only show their own activity (no children to aggregate)
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

4. **Place Aggregated Activity:** (NEW)
   - Fields: `placeId` (Ascending) + `createdAt` (Descending)

5. **Container Aggregated Activity:** (NEW)
   - Fields: `containerId` (Ascending) + `createdAt` (Descending)

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

### Create Operations
- [ ] Creating a place logs `created` on the place
- [ ] Creating a container logs `created` on the container AND `added_to` on the parent place
- [ ] Creating an item logs `created` on the item AND `added_to` on the parent container

### Update Operations
- [ ] Renaming a place logs `renamed` with old/new values
- [ ] Renaming a container logs `renamed` with old/new values
- [ ] Renaming an item logs `renamed` with old/new values
- [ ] Updating other fields (description, photos) logs `updated` with `changedFields`

### Delete Operations
- [ ] Deleting a place logs `deleted` on the place
- [ ] Deleting a container logs `deleted` on container AND `removed_from` on parent place
- [ ] Deleting an item logs `deleted` on item AND `removed_from` on parent container

### Move Operations
- [ ] Moving an item to another container logs:
  - [ ] `moved` on the item (with from/to container names)
  - [ ] `removed_from` on the old container
  - [ ] `added_to` on the new container
- [ ] Moving a container to another place logs:
  - [ ] `moved` on the container (with from/to place names)
  - [ ] `removed_from` on the old place
  - [ ] `added_to` on the new place

### Scan Operations
- [ ] Scanning a container QR code logs `scanned`

### Hierarchy Fields
- [ ] Place activity logs have `placeId` set to the place's own ID
- [ ] Container activity logs have `placeId` AND `containerId` set correctly
- [ ] Item activity logs have `placeId` AND `containerId` set correctly
- [ ] After moving, activity logs use the NEW hierarchy values for aggregation

### Group/Ungroup Operations
- [ ] Grouping items logs `grouped` on each item with group name
- [ ] Grouping items logs `grouped` on the parent container with item list
- [ ] Ungrouping logs `ungrouped` on each item
- [ ] Ungrouping logs `ungrouped` on the parent container with item list
- [ ] Group activity includes item count and item names in metadata

### Aggregation & Filtering (All Activity View)
- [ ] "All Activity" view shows everything for the user
- [ ] Filtering by place shows place + all nested container + item activity
- [ ] Filtering by container shows container + all nested item activity
- [ ] Filtering by specific item shows only that item's activity
- [ ] Activity timestamps display correctly with `formatDistanceToNow`

### Infrastructure
- [ ] All composite indexes created and enabled (check Firebase Console)
- [ ] Security rules prevent unauthorized access
- [ ] Activity logging doesn't break main operations if it fails

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
