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
  createdAt: dateOrTimestampSchema,
  updatedAt: dateOrTimestampSchema,
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
  lastAccessed: dateOrTimestampSchema,
  createdAt: dateOrTimestampSchema,
  updatedAt: dateOrTimestampSchema,
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
  tags: z.array(z.string()),
  groupId: z.string().nullable().optional(),
  createdAt: dateOrTimestampSchema,
  updatedAt: dateOrTimestampSchema,
})

// Export types inferred from schemas
export type ValidatedPlace = z.infer<typeof PlaceSchema>
export type ValidatedContainer = z.infer<typeof ContainerSchema>
export type ValidatedItem = z.infer<typeof ItemSchema>
export type ValidatedGroup = z.infer<typeof GroupSchema>
