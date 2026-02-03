import { useEffect, useState, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineStorage } from '../lib/offlineStorage';
import { storage, db } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export function useBackgroundSync() {
    const isOnline = useNetworkStatus();
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const checkPending = useCallback(async () => {
        try {
            const uploads = await offlineStorage.getPendingUploads();
            setPendingCount(uploads.length);
        } catch (e) {
            console.error('Error checking pending uploads:', e);
        }
    }, []);

    const processQueue = useCallback(async () => {
        if (!isOnline) return;

        // Prevent double processing
        // Note: We don't block if isSyncing is true because a previous sync might have stalled
        // Ideally we would use a mutex or more robust locking, but for this scale rely on simple state

        try {
            const uploads = await offlineStorage.getPendingUploads();
            if (uploads.length === 0) {
                setIsSyncing(false);
                return;
            }

            setIsSyncing(true);
            setPendingCount(uploads.length);

            console.log(`[Sync] Processing ${uploads.length} pending uploads...`);

            for (const upload of uploads) {
                try {
                    console.log(`[Sync] Uploading ${upload.storagePath}...`);

                    // 1. Upload file to Firebase Storage
                    const storageRef = ref(storage, upload.storagePath);
                    await uploadBytes(storageRef, upload.file);
                    const downloadURL = await getDownloadURL(storageRef);

                    // 2. Update Firestore if metadata exists
                    if (upload.metadata) {
                        console.log(`[Sync] Updating Firestore ${upload.metadata.collection}/${upload.metadata.docId}...`);
                        const docRef = doc(db, upload.metadata.collection, upload.metadata.docId);

                        // Check if we need to replace a placeholder in an array (e.g. photos)
                        if (upload.metadata.field === 'photos') {
                            // We need to read the doc to find where to put it
                            // Note: We skip this read if we could use arrayRemove/arrayUnion, 
                            // but we don't know the exact placeholder string easily here without storing it.
                            // Re-constructing placeholder from ID:
                            const placeholder = `urn:stowaway:pending:${upload.id}`;

                            // Using transaction or robust update is better, but for now:
                            // We can use arrayRemove AND arrayUnion if we are sure.
                            // But arrayRemove needs the exact value.

                            try {
                                const docSnap = await getDoc(docRef);
                                if (docSnap.exists()) {
                                    const data = docSnap.data();
                                    const photos = data.photos || [];
                                    const updatedPhotos = photos.map((p: string) => p === placeholder ? downloadURL : p);

                                    // If the placeholder wasn't found (maybe user deleted it?), push it anyway? 
                                    // Or maybe it was already updated?
                                    // Let's assume replace-if-found.
                                    await updateDoc(docRef, {
                                        photos: updatedPhotos
                                    });
                                }
                            } catch (err) {
                                console.error("Error updating photo list in doc", err);
                            }
                        } else {
                            // Simple field update (e.g. voiceNoteUrl)
                            await updateDoc(docRef, {
                                [upload.metadata.field]: downloadURL
                            });
                        }
                    }

                    // 3. Remove from queue on success
                    await offlineStorage.removePendingUpload(upload.id);

                    // Update local count immediately
                    setPendingCount(prev => Math.max(0, prev - 1));

                } catch (error) {
                    console.error(`[Sync] Failed to sync item ${upload.id}:`, error);
                    // We leave it in the IDB queue to retry next time
                }
            }
        } catch (e) {
            console.error('[Sync] Queue processing error:', e);
        } finally {
            setIsSyncing(false);
            // Re-check count to ensure consistency
            checkPending();
        }
    }, [isOnline, checkPending]);

    // Check queue on mount and when interactions happen
    useEffect(() => {
        checkPending();
    }, [checkPending]);

    // Trigger sync when coming online
    useEffect(() => {
        if (isOnline) {
            processQueue();
        }
    }, [isOnline, processQueue]);

    return { isSyncing, pendingCount, triggerSync: processQueue };
}
