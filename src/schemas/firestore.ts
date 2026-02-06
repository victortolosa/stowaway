import { z } from 'zod'
import { Timestamp } from 'firebase/firestore'

// Helper to transform Firestore Timestamp to Date
const timestampSchema = z.custom<Timestamp>(
  (val) => val instanceof Timestamp,
  { message: 'Expected Firestore Timestamp' }
).transform((timestamp) => timestamp.toDate())

// Alternative: accept both Timestamp and Date
const dateOrTimestampSchema = z.union([
  z.date(),
  timestampSchema
])

export const PlaceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  type: z.enum(['home', 'office', 'storage', 'other']),
  photos: z.array(z.string()).optional(),
  groupId: z.string().nullable().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  createdAt: dateOrTimestampSchema,
  updatedAt: dateOrTimestampSchema,
  lastViewedAt: dateOrTimestampSchema.optional(),
})

export const GroupSchema = z.object({
  id: z.string(),
  userId: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  type: z.enum(['place', 'container', 'item']),
  createdAt: dateOrTimestampSchema,
  updatedAt: dateOrTimestampSchema,
})

export const ContainerSchema = z.object({
  id: z.string(),
  userId: z.string(),
  placeId: z.string(),
  name: z.string(),
  qrCodeId: z.string().optional(),
  photoUrl: z.string().optional(),
  photos: z.array(z.string()).optional(),
  groupId: z.string().nullable().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  lastAccessed: dateOrTimestampSchema,
  createdAt: dateOrTimestampSchema,
  updatedAt: dateOrTimestampSchema,
  lastViewedAt: dateOrTimestampSchema.optional(),
})

export const ItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  containerId: z.string(),
  // placeId is optional for backward compatibility with existing items
  // New items will have placeId set automatically by createItem
  placeId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  photos: z.array(z.string()),
  voiceNoteUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
  groupId: z.string().nullable().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  quantity: z.number().optional(),
  createdAt: dateOrTimestampSchema,
  updatedAt: dateOrTimestampSchema,
  lastViewedAt: dateOrTimestampSchema.optional(),
})

/**
 * ACTIVITY LOG SCHEMA
 */
export const ActivityMetadataSchema = z.object({
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
}).optional()

export const ActivitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.enum([
    'created',
    'updated',
    'renamed',
    'deleted',
    'moved',
    'added_to',
    'removed_from',
    'grouped',
    'ungrouped',
    'scanned',
    'viewed'
  ]),
  entityType: z.enum(['place', 'container', 'item']),
  entityId: z.string(),
  entityName: z.string(),
  // Hierarchy fields for aggregation
  // Transform null to undefined for TypeScript compatibility
  placeId: z.string().nullable().optional().transform(val => val ?? undefined),
  containerId: z.string().nullable().optional().transform(val => val ?? undefined),
  metadata: ActivityMetadataSchema.nullable().transform(val => val ?? undefined),
  createdAt: dateOrTimestampSchema,
})

// Export types inferred from schemas
export type ValidatedPlace = z.infer<typeof PlaceSchema>
export type ValidatedContainer = z.infer<typeof ContainerSchema>
export type ValidatedItem = z.infer<typeof ItemSchema>
export type ValidatedGroup = z.infer<typeof GroupSchema>
export type ValidatedActivity = z.infer<typeof ActivitySchema>
