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
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage, auth } from '@/lib/firebase'
import { Place, Container, Item, Group } from '@/types'
import { offlineStorage } from '@/lib/offlineStorage'
import { sanitizeUndefined } from '@/utils/data'
import { PlaceSchema, ContainerSchema, ItemSchema, GroupSchema } from '@/schemas/firestore'

const getCurrentUserId = (): string => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('User must be authenticated');
  }
  return uid;
};

/**
 * PLACES OPERATIONS
 */
export async function getPlace(id: string): Promise<Place | undefined> {
  const docRef = doc(db, 'places', id)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const raw = { id: docSnap.id, ...docSnap.data() }
    return PlaceSchema.parse(raw)
  }
  return undefined
}

export async function createPlace(place: Omit<Place, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  console.log('FirebaseService: Attempting to create place in project:', db.app.options.projectId)
  console.log('Place Data:', place)
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
    console.log('FirebaseService: Place created successfully with ID:', docRef.id)

    // Link pending uploads to this new document
    await linkPendingUploads(docRef.id, 'places', {
      photos: place.photos
    });

    return docRef.id
  } catch (error) {
    console.error('FirebaseService: Error creating place:', error)
    throw error
  }
}

export async function getUserPlaces(userId: string): Promise<Place[]> {
  try {
    const q = query(collection(db, 'places'), where('userId', '==', userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() }
      return PlaceSchema.parse(raw)
    })
  } catch (error) {
    console.error('Error fetching places:', error)
    throw error
  }
}

export async function updatePlace(placeId: string, updates: Partial<Place>) {
  try {
    const placeRef = doc(db, 'places', placeId)
    const sanitizedUpdates = sanitizeUndefined(updates)
    await updateDoc(placeRef, {
      ...sanitizedUpdates,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error updating place:', error)
    throw error
  }
}

export async function deletePlace(placeId: string) {
  try {
    await deleteDoc(doc(db, 'places', placeId))
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
    return ContainerSchema.parse(raw)
  }
  return undefined
}

export async function createContainer(container: Omit<Container, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create a container");

    const sanitizedContainer = sanitizeUndefined(container)

    // Build the container data object
    const containerData: any = {
      ...sanitizedContainer,
      userId, // Ensure userId is attached
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    // Backward compatibility: ensure photoUrl is set if photos are present
    // Only add photoUrl if it has a value (Firestore doesn't allow undefined)
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
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() }
      return ContainerSchema.parse(raw)
    })
  } catch (error) {
    console.error('Error fetching containers:', error)
    throw error
  }
}

export async function getUserContainers(userId: string): Promise<Container[]> {
  try {
    const q = query(collection(db, 'containers'), where('userId', '==', userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() }
      return ContainerSchema.parse(raw)
    })
  } catch (error) {
    console.error('Error fetching user containers:', error)
    throw error
  }
}

export async function updateContainer(containerId: string, updates: Partial<Container>) {
  try {
    const containerRef = doc(db, 'containers', containerId)
    const sanitizedUpdates = sanitizeUndefined(updates)

    // Backward compatibility: sync first photo to photoUrl if photos are updated
    if (updates.photos && updates.photos.length > 0) {
      sanitizedUpdates.photoUrl = updates.photos[0]
    } else if (updates.photos && updates.photos.length === 0) {
      // If photos cleared, perform logic whether to clear photoUrl? 
      // For now let's assume if explicit empty array, we might want to clear it.
      // But let's be safe and only update if specifically requested.
    }

    // Ensure userId is present (fixes data consistency issues for older/bugged containers)
    const userId = getCurrentUserId();
    if (userId) {
      sanitizedUpdates.userId = userId;
    }

    await updateDoc(containerRef, {
      ...sanitizedUpdates,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error updating container:', error)
    throw error
  }
}

export async function deleteContainer(containerId: string) {
  try {
    await deleteDoc(doc(db, 'containers', containerId))
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
    return ItemSchema.parse(raw)
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
    const docRef = await addDoc(collection(db, 'items'), {
      ...sanitizedItem,
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
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() }
      return ItemSchema.parse(raw)
    })
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
    const itemsWithPlaceId = snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() }
      return ItemSchema.parse(raw)
    })

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
    const q = query(collection(db, 'items'), where('userId', '==', userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() }
      return ItemSchema.parse(raw)
    })
  } catch (error) {
    console.error('Error fetching user items:', error)
    throw error
  }
}

export async function getRecentItems(userId: string, limitCount = 20): Promise<Item[]> {
  try {
    const q = query(
      collection(db, 'items'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() }
      return ItemSchema.parse(raw)
    })
  } catch (error) {
    console.error('Error fetching recent items:', error)
    throw error
  }
}

export async function updateItem(itemId: string, updates: Partial<Item>) {
  try {
    const itemRef = doc(db, 'items', itemId)
    const sanitizedUpdates = sanitizeUndefined(updates)
    await updateDoc(itemRef, {
      ...sanitizedUpdates,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error updating item:', error)
    throw error
  }
}

export async function deleteItem(itemId: string) {
  try {
    await deleteDoc(doc(db, 'items', itemId))
  } catch (error) {
    console.error('Error deleting item:', error)
    throw error
  }
}

/**
 * GROUPS OPERATIONS
 */
export async function createGroup(group: Omit<Group, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
  try {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("User must be logged in to create a group");

    const sanitizedGroup = sanitizeUndefined(group)
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
    const q = query(collection(db, 'groups'), where('userId', '==', userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const raw = { id: doc.id, ...doc.data() }
      return GroupSchema.parse(raw)
    })
  } catch (error) {
    console.error('Error fetching user groups:', error)
    throw error
  }
}

export async function updateGroup(groupId: string, updates: Partial<Group>) {
  try {
    const groupRef = doc(db, 'groups', groupId)
    const sanitizedUpdates = sanitizeUndefined(updates)
    await updateDoc(groupRef, {
      ...sanitizedUpdates,
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

    // Batch updates would be better but simple loops for now as per project style
    const updatePromises = snapshot.docs.map(d =>
      updateDoc(doc(db, collectionName, d.id), {
        groupId: null,
        updatedAt: Timestamp.now()
      })
    )
    await Promise.all(updatePromises)

    // 2. Delete the group itself
    await deleteDoc(doc(db, 'groups', groupId))
  } catch (error) {
    console.error('Error deleting group:', error)
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
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
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
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
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
