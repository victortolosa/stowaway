import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  doc,
  Timestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { Place, Container, Item, Group } from '@/types'

/**
 * PLACES OPERATIONS
 */
export async function createPlace(place: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) {
  console.log('FirebaseService: Attempting to create place in project:', db.app.options.projectId)
  console.log('Place Data:', place)
  try {
    const sanitizedPlace = Object.fromEntries(
      Object.entries(place).filter(([_, v]) => v !== undefined)
    )
    const docRef = await addDoc(collection(db, 'places'), {
      ...sanitizedPlace,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    console.log('FirebaseService: Place created successfully with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('FirebaseService: Error creating place:', error)
    throw error
  }
}

export async function getUserPlaces(userId: string) {
  try {
    const q = query(collection(db, 'places'), where('userId', '==', userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Place[]
  } catch (error) {
    console.error('Error fetching places:', error)
    throw error
  }
}

export async function updatePlace(placeId: string, updates: Partial<Place>) {
  try {
    const placeRef = doc(db, 'places', placeId)
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
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
export async function createContainer(container: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const sanitizedContainer = Object.fromEntries(
      Object.entries(container).filter(([_, v]) => v !== undefined)
    )
    const docRef = await addDoc(collection(db, 'containers'), {
      ...sanitizedContainer,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating container:', error)
    throw error
  }
}

export async function getPlaceContainers(placeId: string) {
  try {
    const q = query(
      collection(db, 'containers'),
      where('placeId', '==', placeId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Container[]
  } catch (error) {
    console.error('Error fetching containers:', error)
    throw error
  }
}

export async function updateContainer(containerId: string, updates: Partial<Container>) {
  try {
    const containerRef = doc(db, 'containers', containerId)
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
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
export async function createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const sanitizedItem = Object.fromEntries(
      Object.entries(item).filter(([_, v]) => v !== undefined)
    )
    const docRef = await addDoc(collection(db, 'items'), {
      ...sanitizedItem,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating item:', error)
    throw error
  }
}

export async function getContainerItems(containerId: string) {
  try {
    const q = query(
      collection(db, 'items'),
      where('containerId', '==', containerId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Item[]
  } catch (error) {
    console.error('Error fetching items:', error)
    throw error
  }
}

export async function updateItem(itemId: string, updates: Partial<Item>) {
  try {
    const itemRef = doc(db, 'items', itemId)
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
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
export async function createGroup(group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const sanitizedGroup = Object.fromEntries(
      Object.entries(group).filter(([_, v]) => v !== undefined)
    )
    const docRef = await addDoc(collection(db, 'groups'), {
      ...sanitizedGroup,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating group:', error)
    throw error
  }
}

export async function getUserGroups(userId: string) {
  try {
    const q = query(collection(db, 'groups'), where('userId', '==', userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Group[]
  } catch (error) {
    console.error('Error fetching user groups:', error)
    throw error
  }
}

export async function updateGroup(groupId: string, updates: Partial<Group>) {
  try {
    const groupRef = doc(db, 'groups', groupId)
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
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
 * STORAGE OPERATIONS
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    // Validate file size (max 10MB before compression)
    const maxSizeBytes = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSizeBytes) {
      throw new Error('Image size must be less than 10MB')
    }

    const storageRef = ref(storage, path)

    // Add cache control metadata for browser caching
    const metadata = {
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
      contentType: file.type,
    }

    await uploadBytes(storageRef, file, metadata)
    return getDownloadURL(storageRef)
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

export async function uploadAudio(file: File, path: string): Promise<string> {
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
    console.error('Error uploading audio:', error)
    throw error
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
        await deleteStorageFile(path)
        console.log('Cleaned up orphaned audio file:', path)
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
        await deleteStorageFile(path)
        console.log('Cleaned up orphaned file:', path)
      } catch (cleanupError) {
        console.error('Failed to cleanup orphaned file:', cleanupError)
      }
    }
    throw error
  }
}
