export interface Place {
  id: string
  userId: string
  name: string
  type: 'home' | 'office' | 'storage' | 'other'
  createdAt: Date
  updatedAt: Date
  lastViewedAt?: Date
  groupId?: string | null
  photos?: string[]
  color?: string
  icon?: string
}

export interface Group {
  id: string
  userId: string
  parentId: string | null // placeId, containerId, or null (for Place groups)
  name: string
  type: 'place' | 'container' | 'item'
  createdAt: Date
  updatedAt: Date
}

export interface Container {
  id: string
  userId: string
  placeId: string
  name: string
  qrCodeId?: string
  photoUrl?: string
  lastAccessed: Date
  createdAt: Date
  updatedAt: Date
  lastViewedAt?: Date
  groupId?: string | null
  photos?: string[]
  color?: string
  icon?: string
}

export interface Item {
  id: string
  userId: string
  containerId: string
  placeId?: string // Optional for backward compatibility with existing items
  name: string
  description?: string
  photos: string[]
  voiceNoteUrl?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  lastViewedAt?: Date
  groupId?: string | null
  color?: string
  icon?: string
  quantity?: number
}

export interface SearchResult {
  item: Item
  container: Container
  place: Place
}

/**
 * ACTIVITY LOG TYPES
 */
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
  | 'viewed'        // Track views

export type ActivityEntityType = 'place' | 'container' | 'item'

export interface ActivityMetadata {
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
  metadata?: ActivityMetadata

  // Timestamps
  createdAt: Date
}
