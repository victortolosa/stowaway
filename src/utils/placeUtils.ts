import { Place, PlaceRole } from '@/types'

export function isPlaceShared(place: Place, currentUserId?: string | null): boolean {
  const ownerId = place.ownerId || place.userId
  if (!ownerId) return false
  if (place.memberIds && place.memberIds.length > 1) return true
  if (currentUserId && ownerId !== currentUserId) return true
  return false
}

export function getPlaceRole(place: Place, currentUserId?: string | null): PlaceRole {
  const ownerId = place.ownerId || place.userId
  if (!currentUserId) return 'viewer'
  if (place.memberRoles?.[currentUserId]) {
    return place.memberRoles[currentUserId]
  }
  if (ownerId && currentUserId === ownerId) return 'owner'
  return 'viewer'
}

export function canEditPlace(place: Place, currentUserId?: string | null): boolean {
  const role = getPlaceRole(place, currentUserId)
  return role === 'owner' || role === 'editor'
}
