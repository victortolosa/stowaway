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
import { Place, Container, Item } from '@/types'

/**
 * PLACES OPERATIONS
 */
export async function createPlace(place: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'places'), {
      ...place,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating place:', error)
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
    await updateDoc(placeRef, {
      ...updates,
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
    const docRef = await addDoc(collection(db, 'containers'), {
      ...container,
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
    await updateDoc(containerRef, {
      ...updates,
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

/**
 * ITEMS OPERATIONS
 */
export async function createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'items'), {
      ...item,
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
    await updateDoc(itemRef, {
      ...updates,
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
 * STORAGE OPERATIONS
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

export async function uploadAudio(file: File, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  } catch (error) {
    console.error('Error uploading audio:', error)
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
