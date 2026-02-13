import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage, auth } from '@/lib/firebase'
import { Place, PlaceRole, Container, Item, Group, Activity, ActivityAction, ActivityEntityType, ActivityMetadata, UserProfile } from '@/types'
import { offlineStorage } from '@/lib/offlineStorage'
import { sanitizeUndefined, getChangedFields } from '@/utils/data'
import { PlaceSchema, ContainerSchema, ItemSchema, GroupSchema, ActivitySchema, UserProfileSchema } from '@/schemas/firestore'
import {
  generatePlaceKey,
  getPlaceKey,
  importKey,
  encrypt,
  encryptFields,
  decryptFields,
  encryptMetadata,
  decryptMetadata,
} from '@/lib/encryption'

const getCurrentUserId = (): string => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('User must be authenticated');
  }
  return uid;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const getPlaceOwnerId = (place: Place) => place.ownerId || place.userId;

const ensurePlaceMemberState = (place: Place) => {
  const ownerId = getPlaceOwnerId(place);
  const memberIds = place.memberIds && place.memberIds.length > 0 ? place.memberIds : [ownerId];
  const memberRoles = {
    ...(place.memberRoles || {}),
    [ownerId]: 'owner' as PlaceRole,
  };
  return { ownerId, memberIds: Array.from(new Set(memberIds)), memberRoles };
};

const chunkArray = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/**
 * USER PROFILE OPERATIONS
 */
export async function upsertUserProfile(profile: {
  uid: string
  email: string
  displayName?: string | null
  photoURL?: string | null
}) {
  const userRef = doc(db, 'users', profile.uid)
  const publicRef = doc(db, 'publicProfiles', profile.uid)
  const existing = await getDoc(userRef)
  const now = Timestamp.now()
  const data = {
    uid: profile.uid,
    email: normalizeEmail(profile.email),
    displayName: profile.displayName ?? null,
    photoURL: profile.photoURL ?? null,
    updatedAt: now,
    createdAt: existing.exists() ? (existing.data().createdAt || now) : now,
  }
  // Atomically write to both users (private) and publicProfiles (for lookups)
  const batch = writeBatch(db)
  batch.set(userRef, data, { merge: true })
  batch.set(publicRef, {
    uid: profile.uid,
    email: normalizeEmail(profile.email),
    displayName: profile.displayName ?? null,
    photoURL: profile.photoURL ?? null,
    updatedAt: now,
  }, { merge: true })
  await batch.commit()
}

export async function getUserProfile(uid: string): Promise<UserProfile | undefined> {
  const docRef = doc(db, 'users', uid)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const raw = { uid: docSnap.id, ...docSnap.data() }
    return UserProfileSchema.parse(raw)
  }
  return undefined
}

export async function getUserByEmail(email: string): Promise<UserProfile | undefined> {
  const normalized = normalizeEmail(email)
  const q = query(collection(db, 'publicProfiles'), where('email', '==', normalized))
  const snapshot = await getDocs(q)
  const docSnap = snapshot.docs[0]
  if (!docSnap) return undefined
  const raw = { uid: docSnap.id, ...docSnap.data() }
  return UserProfileSchema.parse(raw)
}

export async function getUserProfilesByIds(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) return []
  const chunks = chunkArray(uids, 10)
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, 'publicProfiles'), where('uid', 'in', chunk))
      const snapshot = await getDocs(q)
      return snapshot.docs.reduce<UserProfile[]>((acc, docSnap) => {
        const raw = { uid: docSnap.id, ...docSnap.data() }
        const result = UserProfileSchema.safeParse(raw)
        if (result.success) {
          acc.push(result.data)
        } else {
          console.warn(`Invalid ${docSnap.ref.path}:`, result.error.message)
        }
        return acc
      }, [])
    })
  )
  return results.flat()
}

/**
 * PLACES OPERATIONS
 */
export async function getPlace(id: string): Promise<Place | undefined> {
  const docRef = doc(db, 'places', id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const raw = { id: docSnap.id, ...docSnap.data() }
    const place = PlaceSchema.parse(raw)
    const key = await getPlaceKey(id)
    if (key) {
      return decryptFields(place, ['name'], key)
    }
    return place
  }
  return undefined
}

export async function createPlace(place: Omit<Place, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create a place");

    // Generate encryption key and import it locally
    const dekBase64 = await generatePlaceKey()
    const cryptoKey = await importKey(dekBase64)

    // Pre-generate doc ref to get ID without writing
    const placeRef = doc(collection(db, 'places'))
    const placeId = placeRef.id

    // Encrypt name before any write — no plaintext window
    const encryptedName = await encrypt(place.name, cryptoKey)

    const sanitizedPlace = sanitizeUndefined(place)
    const ownerId = userId
    const memberIds = [ownerId]
    const memberRoles = { [ownerId]: 'owner' as PlaceRole }
    const now = Timestamp.now()

    // Atomically write the place doc + DEK in a single batch
    const batch = writeBatch(db)
    batch.set(placeRef, {
      ...sanitizedPlace,
      name: encryptedName,
      userId,
      ownerId,
      memberIds,
      memberRoles,
      createdAt: now,
      updatedAt: now,
    })
    const keyRef = doc(db, 'places', placeId, 'keys', 'dek')
    batch.set(keyRef, { key: dekBase64 })
    await batch.commit()

    // Link pending uploads to this new document
    await linkPendingUploads(placeId, 'places', {
      photos: place.photos
    });

    // Log activity
    await logActivity('created', 'place', placeId, place.name, {
      placeId,
    });

    return placeId
  } catch (error) {
    console.error('FirebaseService: Error creating place:', error)
    throw error
  }
}

export async function getUserPlaces(userId: string): Promise<Place[]> {
  try {
    const placeMap = new Map<string, Place>()

    const memberQuery = query(collection(db, 'places'), where('memberIds', 'array-contains', userId))
    const memberSnapshot = await getDocs(memberQuery)
    memberSnapshot.docs.forEach((docSnap) => {
      const raw = { id: docSnap.id, ...docSnap.data() }
      const result = PlaceSchema.safeParse(raw)
      if (result.success) {
        placeMap.set(result.data.id, result.data)
      } else {
        console.warn(`Invalid ${docSnap.ref.path}:`, result.error.message)
      }
    })

    const ownerQuery = query(collection(db, 'places'), where('userId', '==', userId))
    const ownerSnapshot = await getDocs(ownerQuery)
    ownerSnapshot.docs.forEach((docSnap) => {
      const raw = { id: docSnap.id, ...docSnap.data() }
      const result = PlaceSchema.safeParse(raw)
      if (result.success) {
        placeMap.set(result.data.id, result.data)
      } else {
        console.warn(`Invalid ${docSnap.ref.path}:`, result.error.message)
      }
    })

    // Decrypt all places
    const places = Array.from(placeMap.values())
    const decrypted = await Promise.all(
      places.map(async (place) => {
        const key = await getPlaceKey(place.id)
        if (key) {
          return decryptFields(place, ['name'], key)
        }
        return place
      })
    )
    return decrypted
  } catch (error) {
    console.error('Error fetching places:', error)
    throw error
  }
}

export async function getAccessiblePlaces(userId: string): Promise<Place[]> {
  return getUserPlaces(userId)
}

export async function updatePlace(placeId: string, updates: Partial<Place>) {
  try {
    const placeRef = doc(db, 'places', placeId)

    // Get old data for activity log (already decrypted by getPlace)
    const oldPlace = await getPlace(placeId);
    if (!oldPlace) throw new Error("Place not found");

    const sanitizedUpdates = sanitizeUndefined(updates)

    // Encrypt fields before write
    const key = await getPlaceKey(placeId)
    const updatesToWrite = { ...sanitizedUpdates }
    if (key && updates.name) {
      updatesToWrite.name = await encrypt(updates.name, key)
    }

    await updateDoc(placeRef, {
      ...updatesToWrite,
      updatedAt: Timestamp.now(),
    })

    // Log activity (uses plaintext names — encryption happens inside logActivity)
    const changedFields = getChangedFields(updates, oldPlace);
    const currentName = updates.name || oldPlace.name;

    if (updates.name && updates.name !== oldPlace.name) {
      await logActivity('renamed', 'place', placeId, currentName, {
        placeId: placeId,
      }, {
        oldValue: oldPlace.name,
        newValue: updates.name,
        changedFields,
      });
    } else if (changedFields.length > 0) {
      await logActivity('updated', 'place', placeId, currentName, {
        placeId: placeId,
      }, {
        changedFields,
      });
    }
  } catch (error) {
    console.error('Error updating place:', error)
    throw error
  }
}

export async function addPlaceMember(placeId: string, memberUid: string, role: PlaceRole) {
  const place = await getPlace(placeId)
  if (!place) throw new Error('Place not found')
  const { ownerId, memberIds, memberRoles } = ensurePlaceMemberState(place)
  const nextMemberIds = Array.from(new Set([...memberIds, memberUid]))
  const nextMemberRoles = { ...memberRoles, [memberUid]: role, [ownerId]: 'owner' as PlaceRole }
  await updatePlace(placeId, { memberIds: nextMemberIds, memberRoles: nextMemberRoles })
}

export async function updatePlaceMemberRole(placeId: string, memberUid: string, role: PlaceRole) {
  const place = await getPlace(placeId)
  if (!place) throw new Error('Place not found')
  const { ownerId, memberIds, memberRoles } = ensurePlaceMemberState(place)
  if (memberUid === ownerId) return
  if (!memberIds.includes(memberUid)) {
    throw new Error('Member not found in this place')
  }
  const nextMemberRoles = { ...memberRoles, [memberUid]: role, [ownerId]: 'owner' as PlaceRole }
  await updatePlace(placeId, { memberRoles: nextMemberRoles })
}

export async function removePlaceMember(placeId: string, memberUid: string) {
  const place = await getPlace(placeId)
  if (!place) throw new Error('Place not found')
  const { ownerId, memberIds, memberRoles } = ensurePlaceMemberState(place)
  if (memberUid === ownerId) return
  const nextMemberIds = memberIds.filter((id) => id !== memberUid)
  const nextMemberRoles = { ...memberRoles }
  delete nextMemberRoles[memberUid]
  await updatePlace(placeId, { memberIds: nextMemberIds, memberRoles: nextMemberRoles })
}

export async function deletePlace(placeId: string) {
  try {
    // Get name before deletion for activity log
    const place = await getPlace(placeId);

    await deleteDoc(doc(db, 'places', placeId))

    // Log activity
    if (place) {
      await logActivity('deleted', 'place', placeId, place.name, {
        placeId: placeId,
      });
    }
  } catch (error) {
    console.error('Error deleting place:', error)
    throw error
  }
}

/**
 * CONTAINERS OPERATIONS
 */
// ... imports ...



// ...

/**
 * CONTAINERS OPERATIONS
 */
export async function getContainer(id: string): Promise<Container | undefined> {
  const docRef = doc(db, 'containers', id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const raw = { id: docSnap.id, ...docSnap.data() }
    const container = ContainerSchema.parse(raw)
    const key = await getPlaceKey(container.placeId)
    if (key) {
      return decryptFields(container, ['name'], key)
    }
    return container
  }
  return undefined
}

export async function createContainer(container: Omit<Container, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create a container");

    const place = await getPlace(container.placeId);
    if (!place) throw new Error("Place not found");

    const sanitizedContainer = sanitizeUndefined(container)

    // Encrypt name before write
    const key = await getPlaceKey(container.placeId)
    let nameToStore = container.name
    if (key) {
      nameToStore = await encrypt(container.name, key)
    }

    // Build the container data object
    const containerData: Record<string, unknown> = {
      ...sanitizedContainer,
      name: nameToStore,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    // Backward compatibility: ensure photoUrl is set if photos are present
    const photoUrl = container.photoUrl || (container.photos && container.photos.length > 0 ? container.photos[0] : null)
    if (photoUrl) {
      containerData.photoUrl = photoUrl
    }

    const docRef = await addDoc(collection(db, 'containers'), containerData)

    // Link pending uploads to this new document
    await linkPendingUploads(docRef.id, 'containers', {
      photoUrl: container.photoUrl,
      photos: container.photos
    });

    // Log activity on the container itself
    await logActivity('created', 'container', docRef.id, container.name, {
      placeId: container.placeId,
      containerId: docRef.id,
    });

    // Log activity on the parent place (container was added to it)
    await logActivity('added_to', 'place', container.placeId, place.name, {
      placeId: container.placeId,
    }, {
      childEntityType: 'container',
      childEntityId: docRef.id,
      childEntityName: container.name,
    });

    return docRef.id
  } catch (error) {
    console.error('Error creating container:', error)
    throw error
  }
}

// ... existing items/groups code ...



export async function getPlaceContainers(placeId: string): Promise<Container[]> {
  try {
    const q = query(
      collection(db, 'containers'),
      where('placeId', '==', placeId)
    )
    const snapshot = await getDocs(q)
    const containers = snapshot.docs.reduce<Container[]>((acc, d) => {
      const raw = { id: d.id, ...d.data() }
      const result = ContainerSchema.safeParse(raw)
      if (result.success) {
        acc.push(result.data)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
      return acc
    }, [])
    const key = await getPlaceKey(placeId)
    if (key) {
      return Promise.all(
        containers.map((c) => decryptFields(c, ['name'], key))
      )
    }
    return containers
  } catch (error) {
    console.error('Error fetching containers:', error)
    throw error
  }
}

export async function getUserContainers(userId: string): Promise<Container[]> {
  try {
    const places = await getAccessiblePlaces(userId)
    const placeIds = places.map((place) => place.id)
    return getAccessibleContainers(placeIds)
  } catch (error) {
    console.error('Error fetching user containers:', error)
    throw error
  }
}

export async function getAccessibleContainers(placeIds: string[]): Promise<Container[]> {
  if (placeIds.length === 0) return []
  const chunks = chunkArray(placeIds, 10)
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const q = query(collection(db, 'containers'), where('placeId', 'in', chunk))
      const snapshot = await getDocs(q)
      return snapshot.docs.reduce<Container[]>((acc, d) => {
        const raw = { id: d.id, ...d.data() }
        const result = ContainerSchema.safeParse(raw)
        if (result.success) {
          acc.push(result.data)
        } else {
          console.warn(`Invalid ${d.ref.path}:`, result.error.message)
        }
        return acc
      }, [])
    })
  )
  const containers = results.flat()
  // Decrypt all containers
  return Promise.all(
    containers.map(async (c) => {
      const key = await getPlaceKey(c.placeId)
      if (key) {
        return decryptFields(c, ['name'], key)
      }
      return c
    })
  )
}

export async function updateContainer(containerId: string, updates: Partial<Container>) {
  try {
    const containerRef = doc(db, 'containers', containerId)

    // Get old data for activity log (already decrypted by getContainer)
    const oldContainer = await getContainer(containerId);
    if (!oldContainer) throw new Error("Container not found");

    const sanitizedUpdates = sanitizeUndefined(updates)

    // Backward compatibility: sync first photo to photoUrl if photos are updated
    if (updates.photos && updates.photos.length > 0) {
      sanitizedUpdates.photoUrl = updates.photos[0]
    } else if (updates.photos && updates.photos.length === 0) {
      // noop
    }

    // Encrypt name before write
    const updatesToWrite = { ...sanitizedUpdates }
    const key = await getPlaceKey(oldContainer.placeId)
    if (key && updates.name) {
      updatesToWrite.name = await encrypt(updates.name, key)
    }

    await updateDoc(containerRef, {
      ...updatesToWrite,
      updatedAt: Timestamp.now(),
    })

    // Log activity (plaintext names — encryption happens in logActivity)
    const changedFields = getChangedFields(updates, oldContainer);
    const currentName = updates.name || oldContainer.name;

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
      await logActivity('updated', 'container', containerId, currentName, {
        placeId: oldContainer.placeId,
        containerId: containerId,
      }, {
        changedFields,
      });
    }
  } catch (error) {
    console.error('Error updating container:', error)
    throw error
  }
}

export async function deleteContainer(containerId: string) {
  try {
    // Get container and place info before deletion
    const container = await getContainer(containerId);
    if (!container) throw new Error("Container not found");

    const place = await getPlace(container.placeId);

    await deleteDoc(doc(db, 'containers', containerId))

    // Log activity on the container itself
    await logActivity('deleted', 'container', containerId, container.name, {
      placeId: container.placeId,
      containerId: containerId,
    });

    // Log activity on the parent place (container was removed from it)
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
    console.error('Error deleting container:', error)
    throw error
  }
}

export async function generateQRCodeForContainer(containerId: string) {
  try {
    const containerRef = doc(db, 'containers', containerId)
    await updateDoc(containerRef, {
      qrCodeId: containerId,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

export async function removeQRCodeFromContainer(containerId: string) {
  try {
    const containerRef = doc(db, 'containers', containerId)
    await updateDoc(containerRef, {
      qrCodeId: null,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error removing QR code:', error)
    throw error
  }
}

/**
 * ITEMS OPERATIONS
 */
export async function getItem(id: string): Promise<Item | undefined> {
  const docRef = doc(db, 'items', id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const raw = { id: docSnap.id, ...docSnap.data() }
    const item = ItemSchema.parse(raw)
    const placeId = item.placeId || (await getContainer(item.containerId))?.placeId
    if (placeId) {
      const key = await getPlaceKey(placeId)
      if (key) {
        return decryptFields(item, ['name', 'description', 'tags'], key)
      }
    }
    return item
  }
  return undefined
}

export async function createItem(item: Omit<Item, 'id' | 'userId' | 'placeId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create an item");

    // Fetch container to get placeId for denormalization
    const container = await getContainer(item.containerId);
    if (!container) throw new Error("Container not found");

    const sanitizedItem = sanitizeUndefined(item)

    // Encrypt fields before write
    const key = await getPlaceKey(container.placeId)
    let itemToWrite = { ...sanitizedItem }
    if (key) {
      itemToWrite = await encryptFields(itemToWrite, ['name', 'description', 'tags'], key)
    }

    const docRef = await addDoc(collection(db, 'items'), {
      ...itemToWrite,
      userId,
      placeId: container.placeId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    // Link pending uploads to this new document
    await linkPendingUploads(docRef.id, 'items', {
      photos: item.photos,
      voiceNoteUrl: item.voiceNoteUrl
    });

    // Log activity on the item itself (plaintext name)
    await logActivity('created', 'item', docRef.id, item.name, {
      placeId: container.placeId,
      containerId: item.containerId,
    });

    // Log activity on the parent container (item was added to it)
    await logActivity('added_to', 'container', item.containerId, container.name, {
      placeId: container.placeId,
      containerId: item.containerId,
    }, {
      childEntityType: 'item',
      childEntityId: docRef.id,
      childEntityName: item.name,
    });

    return docRef.id
  } catch (error) {
    console.error('Error creating item:', error)
    throw error
  }
}

export async function getContainerItems(containerId: string): Promise<Item[]> {
  try {
    const q = query(
      collection(db, 'items'),
      where('containerId', '==', containerId)
    )
    const snapshot = await getDocs(q)
    const items = snapshot.docs.reduce<Item[]>((acc, d) => {
      const raw = { id: d.id, ...d.data() }
      const result = ItemSchema.safeParse(raw)
      if (result.success) {
        acc.push(result.data)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
      return acc
    }, [])
    // Decrypt — all items in a container share the same placeId
    if (items.length > 0) {
      const placeId = items[0].placeId || (await getContainer(containerId))?.placeId
      if (placeId) {
        const key = await getPlaceKey(placeId)
        if (key) {
          return Promise.all(
            items.map((item) => decryptFields(item, ['name', 'description', 'tags'], key))
          )
        }
      }
    }
    return items
  } catch (error) {
    console.error('Error fetching items:', error)
    throw error
  }
}

export async function getPlaceItems(placeId: string): Promise<Item[]> {
  try {
    // Direct query for items with placeId (optimized path)
    const q = query(
      collection(db, 'items'),
      where('placeId', '==', placeId)
    )
    const snapshot = await getDocs(q)
    const key = await getPlaceKey(placeId)
    const rawItems = snapshot.docs.reduce<Item[]>((acc, d) => {
      const raw = { id: d.id, ...d.data() }
      const result = ItemSchema.safeParse(raw)
      if (result.success) {
        acc.push(result.data)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
      return acc
    }, [])
    const itemsWithPlaceId = key
      ? await Promise.all(rawItems.map((item) => decryptFields(item, ['name', 'description', 'tags'], key)))
      : rawItems

    // TODO: Remove this backward compatibility code once all items have been migrated to include placeId
    // This handles legacy items created before placeId denormalization was added
    // Get containers to check for legacy items without placeId
    const containers = await getPlaceContainers(placeId)
    if (containers.length === 0) {
      return itemsWithPlaceId
    }

    // Fetch items by container (N+1 query for legacy items without placeId)
    const itemsPromises = containers.map(c => getContainerItems(c.id))
    const results = await Promise.all(itemsPromises)
    const itemsByContainer = results.flat()

    // Deduplicate: combine both result sets by ID
    const itemMap = new Map<string, Item>()

    // Add items from direct query
    itemsWithPlaceId.forEach(item => itemMap.set(item.id, item))

    // Add items from container queries (only if not already present)
    itemsByContainer.forEach(item => {
      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, item)
      }
    })

    return Array.from(itemMap.values())
  } catch (error) {
    console.error('Error fetching place items:', error)
    throw error
  }
}

export async function getUserItems(userId: string): Promise<Item[]> {
  try {
    const places = await getAccessiblePlaces(userId)
    const placeIds = places.map((place) => place.id)
    return getAccessibleItems(placeIds)
  } catch (error) {
    console.error('Error fetching user items:', error)
    throw error
  }
}

export async function getRecentItems(userId: string, limitCount = 20): Promise<Item[]> {
  try {
    const places = await getAccessiblePlaces(userId)
    const placeIds = places.map((place) => place.id)
    const allItems = await getAccessibleItems(placeIds)
    return allItems
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limitCount)
  } catch (error) {
    console.error('Error fetching recent items:', error)
    throw error
  }
}

export async function getAccessibleItems(placeIds: string[]): Promise<Item[]> {
  if (placeIds.length === 0) return []
  const results = await Promise.all(placeIds.map((placeId) => getPlaceItems(placeId)))
  const allItems = results.flat()
  // Defensive dedupe in case items are returned multiple times across place queries.
  const itemMap = new Map<string, Item>()
  allItems.forEach((item) => {
    if (!itemMap.has(item.id)) itemMap.set(item.id, item)
  })
  return Array.from(itemMap.values())
}

export async function updateItem(itemId: string, updates: Partial<Item>) {
  try {
    const itemRef = doc(db, 'items', itemId)

    // Get old data for activity log (already decrypted by getItem)
    const oldItem = await getItem(itemId);
    if (!oldItem) throw new Error("Item not found");

    const sanitizedUpdates = sanitizeUndefined(updates)
    let resolvedPlaceId = oldItem.placeId
    if (!oldItem.placeId) {
      const container = await getContainer(oldItem.containerId)
      if (container) {
        sanitizedUpdates.placeId = container.placeId
        resolvedPlaceId = container.placeId
      }
    }

    // Encrypt fields before write
    let updatesToWrite = { ...sanitizedUpdates }
    if (resolvedPlaceId) {
      const key = await getPlaceKey(resolvedPlaceId)
      if (key) {
        updatesToWrite = await encryptFields(
          updatesToWrite,
          ['name', 'description', 'tags'],
          key
        )
      }
    }

    await updateDoc(itemRef, {
      ...updatesToWrite,
      updatedAt: Timestamp.now(),
    })

    // Log activity (plaintext names)
    const changedFields = getChangedFields(updates, oldItem);
    const currentName = updates.name || oldItem.name;

    if (updates.name && updates.name !== oldItem.name) {
      await logActivity('renamed', 'item', itemId, currentName, {
        placeId: resolvedPlaceId,
        containerId: oldItem.containerId,
      }, {
        oldValue: oldItem.name,
        newValue: updates.name,
        changedFields,
      });
    } else if (changedFields.length > 0) {
      await logActivity('updated', 'item', itemId, currentName, {
        placeId: resolvedPlaceId,
        containerId: oldItem.containerId,
      }, {
        changedFields,
      });
    }
  } catch (error) {
    console.error('Error updating item:', error)
    throw error
  }
}

export async function deleteItem(itemId: string) {
  try {
    // Get item and container info before deletion
    const item = await getItem(itemId);
    if (!item) throw new Error("Item not found");

    const container = await getContainer(item.containerId);
    const resolvedPlaceId = item.placeId || container?.placeId;

    await deleteDoc(doc(db, 'items', itemId))

    // Log activity on the item itself
    await logActivity('deleted', 'item', itemId, item.name, {
      placeId: resolvedPlaceId,
      containerId: item.containerId,
    });

    // Log activity on the parent container (item was removed from it)
    if (container) {
      await logActivity('removed_from', 'container', item.containerId, container.name, {
        placeId: resolvedPlaceId,
        containerId: item.containerId,
      }, {
        childEntityType: 'item',
        childEntityId: itemId,
        childEntityName: item.name,
      });
    }
  } catch (error) {
    console.error('Error deleting item:', error)
    throw error
  }
}

/**
 * Move an item to a different container (with activity logging)
 */
export async function moveItem(itemId: string, newContainerId: string) {
  try {
    const item = await getItem(itemId);
    if (!item) throw new Error("Item not found");

    const oldContainer = await getContainer(item.containerId);
    const newContainer = await getContainer(newContainerId);
    if (!newContainer) throw new Error("Destination container not found");

    const oldContainerId = item.containerId;
    const oldPlaceId = item.placeId || oldContainer?.placeId;

    // Update the item's containerId (and placeId if container is in different place)
    await updateDoc(doc(db, 'items', itemId), {
      containerId: newContainerId,
      placeId: newContainer.placeId,
      updatedAt: Timestamp.now(),
    });

    // Log 'moved' activity on the item
    await logActivity('moved', 'item', itemId, item.name, {
      placeId: newContainer.placeId,
      containerId: newContainerId,
    }, {
      fromContainerId: oldContainerId,
      fromContainerName: oldContainer?.name,
      toContainerId: newContainerId,
      toContainerName: newContainer.name,
    });

    // Log 'removed_from' on the old container
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

    // Log 'added_to' on the new container
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

/**
 * Move a container to a different place (with activity logging)
 * Also updates placeId on all items within the container
 */
export async function moveContainer(containerId: string, newPlaceId: string) {
  try {
    const container = await getContainer(containerId);
    if (!container) throw new Error("Container not found");

    const oldPlace = await getPlace(container.placeId);
    const newPlace = await getPlace(newPlaceId);
    if (!newPlace) throw new Error("Destination place not found");

    const oldPlaceId = container.placeId;
    const now = Timestamp.now();

    // Atomically update container + all its items in a single batch
    const items = await getContainerItems(containerId);
    const batch = writeBatch(db);
    batch.update(doc(db, 'containers', containerId), {
      placeId: newPlaceId,
      updatedAt: now,
    });
    for (const item of items) {
      batch.update(doc(db, 'items', item.id), {
        placeId: newPlaceId,
        updatedAt: now,
      });
    }
    await batch.commit();

    // Log 'moved' activity on the container
    await logActivity('moved', 'container', containerId, container.name, {
      placeId: newPlaceId,
      containerId: containerId,
    }, {
      fromPlaceId: oldPlaceId,
      fromPlaceName: oldPlace?.name,
      toPlaceId: newPlaceId,
      toPlaceName: newPlace.name,
    });

    // Log 'removed_from' on the old place
    if (oldPlace) {
      await logActivity('removed_from', 'place', oldPlaceId, oldPlace.name, {
        placeId: oldPlaceId,
      }, {
        childEntityType: 'container',
        childEntityId: containerId,
        childEntityName: container.name,
      });
    }

    // Log 'added_to' on the new place
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

/**
 * GROUPS OPERATIONS
 */
export async function getGroup(id: string): Promise<Group | undefined> {
  const docRef = doc(db, 'groups', id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const raw = { id: docSnap.id, ...docSnap.data() }
    const group = GroupSchema.parse(raw)
    if (group.placeId) {
      const key = await getPlaceKey(group.placeId)
      if (key) {
        return decryptFields(group, ['name'], key)
      }
    }
    return group
  }
  return undefined
}

export async function createGroup(group: Omit<Group, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create a group");

    let resolvedPlaceId: string | null | undefined = group.placeId
    if (resolvedPlaceId === undefined) {
      if (group.type === 'place') {
        resolvedPlaceId = null
      } else if (group.type === 'container') {
        resolvedPlaceId = group.parentId || null
      } else if (group.type === 'item') {
        if (!group.parentId) throw new Error('Parent container is required for item groups')
        const container = await getContainer(group.parentId)
        if (!container) throw new Error('Container not found')
        resolvedPlaceId = container.placeId
      }
    }

    // Encrypt group name if associated with a place
    let nameToStore = group.name
    if (resolvedPlaceId) {
      const key = await getPlaceKey(resolvedPlaceId)
      if (key) {
        nameToStore = await encrypt(group.name, key)
      }
    }

    const sanitizedGroup = sanitizeUndefined({
      ...group,
      name: nameToStore,
      placeId: resolvedPlaceId ?? null,
    })
    const docRef = await addDoc(collection(db, 'groups'), {
      ...sanitizedGroup,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating group:', error)
    throw error
  }
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    const places = await getAccessiblePlaces(userId)
    const placeIds = places.map((place) => place.id)
    return getAccessibleGroups(userId, placeIds)
  } catch (error) {
    console.error('Error fetching user groups:', error)
    throw error
  }
}

export async function getAccessibleGroups(userId: string, placeIds: string[]): Promise<Group[]> {
  const groupMap = new Map<string, Group>()

  if (placeIds.length > 0) {
    const chunks = chunkArray(placeIds, 10)
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(collection(db, 'groups'), where('placeId', 'in', chunk))
        const snapshot = await getDocs(q)
        return snapshot.docs.reduce<Group[]>((acc, docSnap) => {
          const raw = { id: docSnap.id, ...docSnap.data() }
          const result = GroupSchema.safeParse(raw)
          if (result.success) {
            acc.push(result.data)
          } else {
            console.warn(`Invalid ${docSnap.ref.path}:`, result.error.message)
          }
          return acc
        }, [])
      })
    )
    results.flat().forEach((group) => groupMap.set(group.id, group))
  }

  const placeGroupsQuery = query(
    collection(db, 'groups'),
    where('userId', '==', userId),
    where('placeId', '==', null)
  )
  const placeGroupsSnapshot = await getDocs(placeGroupsQuery)
  placeGroupsSnapshot.docs.forEach((docSnap) => {
    const raw = { id: docSnap.id, ...docSnap.data() }
    const result = GroupSchema.safeParse(raw)
    if (result.success) {
      groupMap.set(result.data.id, result.data)
    } else {
      console.warn(`Invalid ${docSnap.ref.path}:`, result.error.message)
    }
  })

  // Decrypt group names
  const groups = Array.from(groupMap.values())
  return Promise.all(
    groups.map(async (group) => {
      if (group.placeId) {
        const key = await getPlaceKey(group.placeId)
        if (key) {
          return decryptFields(group, ['name'], key)
        }
      }
      return group
    })
  )
}

export async function updateGroup(groupId: string, updates: Partial<Group>) {
  try {
    const groupRef = doc(db, 'groups', groupId)
    const sanitizedUpdates = sanitizeUndefined(updates)

    // Encrypt name if updating it
    const updatesToWrite = { ...sanitizedUpdates }
    if (updates.name) {
      // Need to fetch the group to find its placeId
      const group = await getGroup(groupId)
      if (group?.placeId) {
        const key = await getPlaceKey(group.placeId)
        if (key) {
          updatesToWrite.name = await encrypt(updates.name, key)
        }
      }
    }

    await updateDoc(groupRef, {
      ...updatesToWrite,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error updating group:', error)
    throw error
  }
}

export async function deleteGroup(groupId: string, type: 'place' | 'container' | 'item') {
  try {
    // 1. Find all objects in this group and clear their groupId
    const collectionName = type === 'place' ? 'places' : type === 'container' ? 'containers' : 'items'
    const q = query(collection(db, collectionName), where('groupId', '==', groupId))
    const snapshot = await getDocs(q)
    const now = Timestamp.now()

    // 2. Atomically ungroup all entities + delete the group in batches
    // Firestore batches have a 500-operation limit, reserve 1 slot for the group delete
    const MAX_OPS_PER_BATCH = 499
    const docChunks = chunkArray(snapshot.docs, MAX_OPS_PER_BATCH)

    for (let i = 0; i < docChunks.length; i++) {
      const batch = writeBatch(db)
      for (const d of docChunks[i]) {
        batch.update(doc(db, collectionName, d.id), {
          groupId: null,
          updatedAt: now,
        })
      }
      // Include the group delete in the last batch
      if (i === docChunks.length - 1) {
        batch.delete(doc(db, 'groups', groupId))
      }
      await batch.commit()
    }

    // If there were no entities, still delete the group
    if (docChunks.length === 0) {
      await deleteDoc(doc(db, 'groups', groupId))
    }
  } catch (error) {
    console.error('Error deleting group:', error)
    throw error
  }
}

export async function getObjectsByGroup(groupId: string, type: 'place' | 'container' | 'item'): Promise<(Place | Container | Item)[]> {
  try {
    const collectionName = type === 'place' ? 'places' : type === 'container' ? 'containers' : 'items'
    const q = query(
      collection(db, collectionName),
      where('groupId', '==', groupId)
    )
    const snapshot = await getDocs(q)
    const entities = snapshot.docs.reduce<(Place | Container | Item)[]>((acc, d) => {
      const raw = { id: d.id, ...d.data() }
      const schema = type === 'place' ? PlaceSchema : type === 'container' ? ContainerSchema : ItemSchema
      const result = schema.safeParse(raw)
      if (result.success) {
        acc.push(result.data as Place | Container | Item)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
      return acc
    }, [])

    // Decrypt
    return Promise.all(
      entities.map(async (entity) => {
        let placeId: string | undefined
        if (type === 'place') placeId = (entity as Place).id
        else if (type === 'container') placeId = (entity as Container).placeId
        else placeId = (entity as Item).placeId || (await getContainer((entity as Item).containerId))?.placeId

        if (placeId) {
          const key = await getPlaceKey(placeId)
          if (key) {
            const fields = type === 'item' ? ['name', 'description', 'tags'] : ['name']
            return decryptFields(entity, fields, key)
          }
        }
        return entity
      })
    )
  } catch (error) {
    console.error(`Error fetching ${type}s by group:`, error)
    throw error
  }
}

/**
 * PENDING UPLOAD HELPERS
 */
// Helper to link pending uploads to a created document
async function linkPendingUploads(
  docId: string,
  collection: string,
  fields: Record<string, string | string[] | undefined>
): Promise<void> {
  for (const [fieldName, value] of Object.entries(fields)) {
    if (!value) continue;

    const urls = Array.isArray(value) ? value : [value];

    for (const url of urls) {
      if (typeof url === 'string' && url.startsWith('urn:stowaway:pending:')) {
        const pendingId = url.split(':').pop();
        if (pendingId) {
          await offlineStorage.updatePendingUpload(pendingId, {
            metadata: {
              collection,
              docId,
              field: fieldName
            }
          });
        }
      }
    }
  }
}

/**
 * STORAGE OPERATIONS
 */
// Helper to queue upload for background sync
async function queueBackgroundUpload(file: File, path: string, type: 'image' | 'audio'): Promise<string> {
  const tempId = `pending_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  console.log(`[Offline] Queueing ${type} upload:`, tempId);

  await offlineStorage.addPendingUpload({
    id: tempId,
    file,
    storagePath: path,
    createdAt: Date.now()
  });

  // NOTE: Calling UI code (toasts) has been removed from here to decouple the service layer.
  // The caller is responsible for notifying the user if a file is queued for offline upload.

  return `urn:stowaway:pending:${tempId}`;
}

export async function uploadImage(file: File, path: string): Promise<string> {
  // Validate file size (max 10MB before compression)
  const maxSizeBytes = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSizeBytes) {
    throw new Error('Image size must be less than 10MB')
  }

  // Quick check for online status to skip attempt if definitely offline
  if (!navigator.onLine) {
    return queueBackgroundUpload(file, path, 'image');
  }

  try {
    const storageRef = ref(storage, path)

    // Add cache control metadata for browser caching
    const metadata = {
      cacheControl: 'private, max-age=3600', // Private cache, re-validate after 1 hour
      contentType: file.type,
    }

    await uploadBytes(storageRef, file, metadata)
    return getDownloadURL(storageRef)
  } catch (error) {
    console.warn('[Upload] Direct upload failed, falling back to background sync:', error)
    return queueBackgroundUpload(file, path, 'image');
  }
}

export async function uploadAudio(file: File, path: string): Promise<string> {
  // Quick check
  if (!navigator.onLine) {
    return queueBackgroundUpload(file, path, 'audio');
  }

  try {
    const storageRef = ref(storage, path)

    // Add cache control metadata
    const metadata = {
      cacheControl: 'private, max-age=3600', // Private cache, re-validate after 1 hour
      contentType: file.type,
    }

    await uploadBytes(storageRef, file, metadata)
    return getDownloadURL(storageRef)
  } catch (error) {
    console.warn('[Upload] Direct audio upload failed, falling back to background sync:', error)
    return queueBackgroundUpload(file, path, 'audio');
  }
}

export async function uploadAudioWithCleanup(
  file: File,
  path: string,
  onSuccess: (url: string) => Promise<void>
): Promise<string> {
  let uploadedUrl: string | null = null

  try {
    uploadedUrl = await uploadAudio(file, path)

    await onSuccess(uploadedUrl)

    return uploadedUrl
  } catch (error) {
    if (uploadedUrl) {
      try {
        if (uploadedUrl.startsWith('urn:stowaway:pending:')) {
          // Offline pending upload cleanup
          const pendingId = uploadedUrl.split(':').pop();
          if (pendingId) {
            console.log('Cleaning up pending offline audio upload:', pendingId);
            await offlineStorage.removePendingUpload(pendingId);
          }
        } else {
          await deleteStorageFile(path)
          console.log('Cleaned up orphaned audio file:', path)
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup orphaned audio file:', cleanupError)
      }
    }
    throw error
  }
}

export async function deleteStorageFile(path: string) {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

/**
 * Upload image with automatic cleanup if database write fails
 * Returns the download URL, or throws and cleans up the uploaded file
 */
export async function uploadImageWithCleanup(
  file: File,
  path: string,
  onSuccess: (url: string) => Promise<void>
): Promise<string> {
  let uploadedUrl: string | null = null

  try {
    // Upload the image
    uploadedUrl = await uploadImage(file, path)

    // Attempt the database operation
    await onSuccess(uploadedUrl)

    return uploadedUrl
  } catch (error) {
    // If anything failed and we uploaded the file, clean it up
    if (uploadedUrl) {
      try {
        if (uploadedUrl.startsWith('urn:stowaway:pending:')) {
          // Offline pending upload cleanup
          const pendingId = uploadedUrl.split(':').pop();
          if (pendingId) {
            console.log('Cleaning up pending offline upload:', pendingId);
            await offlineStorage.removePendingUpload(pendingId);
          }
        } else {
          // Regular cleanup
          await deleteStorageFile(path)
          console.log('Cleaned up orphaned file:', path)
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup orphaned file:', cleanupError)
      }
    }
    throw error
  }
}

/**
 * ACTIVITY LOG OPERATIONS
 */

// Hierarchy type for activity logging
interface ActivityHierarchy {
  placeId?: string      // Required for place, container, and item activities
  containerId?: string  // Required for container and item activities
}

/**
 * Helper function to log activity (called internally by CRUD operations)
 * placeId and containerId enable hierarchical aggregation queries
 *
 * This function is non-blocking - activity logging failures don't break main operations
 */
export async function logActivity(
  action: ActivityAction,
  entityType: ActivityEntityType,
  entityId: string,
  entityName: string,
  hierarchy: ActivityHierarchy,
  metadata?: ActivityMetadata
): Promise<void> {
  try {
    const userId = getCurrentUserId();

    // Encrypt entityName and metadata using the place's DEK
    let encryptedEntityName = entityName
    let encryptedMetadata: ActivityMetadata | null = (metadata as ActivityMetadata) || null
    if (hierarchy.placeId) {
      const key = await getPlaceKey(hierarchy.placeId)
      if (key) {
        encryptedEntityName = await encrypt(entityName, key)
        if (metadata) {
          encryptedMetadata = await encryptMetadata(metadata, key) ?? null
        }
      }
    }

    await addDoc(collection(db, 'activity'), {
      userId,
      // PII removed — actor info resolved at display time from userId
      action,
      entityType,
      entityId,
      entityName: encryptedEntityName,
      placeId: hierarchy.placeId || null,
      containerId: hierarchy.containerId || null,
      metadata: encryptedMetadata,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    // Log but don't throw - activity logging shouldn't break main operations
    console.error('Error logging activity:', error);
  }
}

/**
 * Helper to decrypt activity records (entityName + metadata)
 */
async function decryptActivities(activities: Activity[]): Promise<Activity[]> {
  return Promise.all(
    activities.map(async (activity) => {
      if (!activity.placeId) return activity
      const key = await getPlaceKey(activity.placeId)
      if (!key) return activity
      const result = await decryptFields(activity, ['entityName'], key)
      if (result.metadata) {
        result.metadata = await decryptMetadata(result.metadata, key) ?? undefined
      }
      return result
    })
  )
}

/**
 * Get activity for a specific entity (for detail pages)
 */
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
    const activities = snapshot.docs.reduce<Activity[]>((acc, d) => {
      const raw = { id: d.id, ...d.data() };
      const result = ActivitySchema.safeParse(raw);
      if (result.success) {
        acc.push(result.data)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
      return acc
    }, []);
    return decryptActivities(activities);
  } catch (error) {
    console.error('Error fetching entity activity:', error);
    throw error;
  }
}

/**
 * Get recent activity for a user (dashboard feed - "All Activity" view)
 */
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
    const activities = snapshot.docs.reduce<Activity[]>((acc, d) => {
      const raw = { id: d.id, ...d.data() };
      const result = ActivitySchema.safeParse(raw);
      if (result.success) {
        acc.push(result.data)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
      return acc
    }, []);
    return decryptActivities(activities);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw error;
  }
}

/**
 * Get recent activity across all accessible places (shared-aware feed)
 */
export async function getAccessibleRecentActivity(
  userId: string,
  limitCount = 50
): Promise<Activity[]> {
  try {
    const places = await getAccessiblePlaces(userId)
    const placeIds = places.map((place) => place.id)

    if (placeIds.length === 0) {
      return getUserRecentActivity(userId, limitCount)
    }

    const chunks = chunkArray(placeIds, 10)
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const q = query(
          collection(db, 'activity'),
          where('placeId', 'in', chunk),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.reduce<Activity[]>((acc, d) => {
          const raw = { id: d.id, ...d.data() }
          const result = ActivitySchema.safeParse(raw)
          if (result.success) {
            acc.push(result.data)
          } else {
            console.warn(`Invalid ${d.ref.path}:`, result.error.message)
          }
          return acc
        }, [])
      })
    )

    const combined = results.flat()
    const deduped = new Map<string, Activity>()
    combined.forEach((activity) => deduped.set(activity.id, activity))

    // Include any legacy activity that lacks placeId but belongs to this user
    const legacyQuery = query(
      collection(db, 'activity'),
      where('userId', '==', userId),
      where('placeId', '==', null),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const legacySnapshot = await getDocs(legacyQuery)
    legacySnapshot.docs.forEach((d) => {
      const raw = { id: d.id, ...d.data() }
      const result = ActivitySchema.safeParse(raw)
      if (result.success) {
        deduped.set(result.data.id, result.data)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
    })

    const sorted = Array.from(deduped.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limitCount)
    return decryptActivities(sorted)
  } catch (error) {
    console.error('Error fetching accessible activity:', error)
    throw error
  }
}

/**
 * Get activity by entity type (e.g., all item activities)
 */
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
    const activities = snapshot.docs.reduce<Activity[]>((acc, d) => {
      const raw = { id: d.id, ...d.data() };
      const result = ActivitySchema.safeParse(raw);
      if (result.success) {
        acc.push(result.data)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
      return acc
    }, []);
    return decryptActivities(activities);
  } catch (error) {
    console.error('Error fetching activity by type:', error);
    throw error;
  }
}

/**
 * Get ALL activity within a place (place + its containers + their items)
 * Used on Place detail pages for aggregated activity view
 */
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
    const activities = snapshot.docs.reduce<Activity[]>((acc, d) => {
      const raw = { id: d.id, ...d.data() };
      const result = ActivitySchema.safeParse(raw);
      if (result.success) {
        acc.push(result.data)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
      return acc
    }, []);
    return decryptActivities(activities);
  } catch (error) {
    console.error('Error fetching place aggregated activity:', error);
    throw error;
  }
}

/**
 * Get ALL activity within a container (container + its items)
 * Used on Container detail pages for aggregated activity view
 */
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
    const activities = snapshot.docs.reduce<Activity[]>((acc, d) => {
      const raw = { id: d.id, ...d.data() };
      const result = ActivitySchema.safeParse(raw);
      if (result.success) {
        acc.push(result.data)
      } else {
        console.warn(`Invalid ${d.ref.path}:`, result.error.message)
      }
      return acc
    }, []);
    return decryptActivities(activities);
  } catch (error) {
    console.error('Error fetching container aggregated activity:', error);
    throw error;
  }
}

/**
 * TRACKING OPERATIONS
 */

/**
 * Track when a container QR code is scanned
 */
export async function trackContainerScan(containerId: string) {
  try {
    const container = await getContainer(containerId);
    if (!container) throw new Error("Container not found");

    // Update lastAccessed
    await updateDoc(doc(db, 'containers', containerId), {
      lastAccessed: Timestamp.now(),
    });

    // Log scan activity
    await logActivity('scanned', 'container', containerId, container.name, {
      placeId: container.placeId,
      containerId: containerId,
    });
  } catch (error) {
    console.error('Error tracking container scan:', error);
    throw error;
  }
}

/**
 * Track when an entity is viewed (call from detail page useEffect)
 * Includes throttling to avoid spamming the activity log
 */
export async function trackEntityView(
  entityType: ActivityEntityType,
  entityId: string,
  options?: { throttleMinutes?: number }
) {
  try {
    const throttleMinutes = options?.throttleMinutes ?? 5;

    // Check if we recently logged a view to avoid spam
    if (throttleMinutes > 0) {
      const recentView = await getRecentViewActivity(entityType, entityId, throttleMinutes);
      if (recentView) return;
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
      let placeId = item.placeId;
      if (!placeId) {
        const container = await getContainer(item.containerId);
        placeId = container?.placeId;
      }
      hierarchy = { placeId, containerId: item.containerId };
    }

    await logActivity('viewed', entityType, entityId, entityName, hierarchy);
  } catch (error) {
    // Silent fail - view tracking shouldn't break the app
    console.error('Error tracking view:', error);
  }
}

/**
 * Helper to check for recent view activity (for throttling)
 */
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

/**
 * Update lastViewedAt field directly on an entity (for "recently viewed" sorting)
 */
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
