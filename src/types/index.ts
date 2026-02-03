export interface Place {
  id: string
  userId: string
  name: string
  type: 'home' | 'office' | 'storage' | 'other'
  createdAt: Date
  updatedAt: Date
  groupId?: string | null
  photos?: string[]
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
  placeId: string
  name: string
  qrCodeId?: string
  photoUrl?: string
  lastAccessed: Date
  createdAt: Date
  updatedAt: Date
  groupId?: string | null
  photos?: string[]
}

export interface Item {
  id: string
  containerId: string
  name: string
  description?: string
  photos: string[]
  voiceNoteUrl?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  groupId?: string | null
}

export interface SearchResult {
  item: Item
  container: Container
  place: Place
}
