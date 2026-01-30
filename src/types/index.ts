export interface Place {
  id: string
  name: string
  type: 'home' | 'office' | 'storage' | 'other'
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
}

export interface SearchResult {
  item: Item
  container: Container
  place: Place
}
