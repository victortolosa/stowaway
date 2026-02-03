import { openDB, type DBSchema } from 'idb';

interface PendingUpload {
    id: string;
    file: Blob;
    storagePath: string;
    // Metadata to update Firestore after successful upload
    metadata?: {
        collection: string;
        docId: string;
        field: string;
    };
    createdAt: number;
}

interface StowawayDB extends DBSchema {
    pending_uploads: {
        key: string;
        value: PendingUpload;
        indexes: { 'by-date': number };
    };
}

const DB_NAME = 'stowaway-offline';
const DB_VERSION = 1;

export async function initDB() {
    return openDB<StowawayDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('pending_uploads')) {
                const store = db.createObjectStore('pending_uploads', {
                    keyPath: 'id',
                });
                store.createIndex('by-date', 'createdAt');
            }
        },
    });
}

export const offlineStorage = {
    async addPendingUpload(upload: PendingUpload) {
        const db = await initDB();
        return db.put('pending_uploads', upload);
    },

    async getPendingUploads() {
        const db = await initDB();
        return db.getAllFromIndex('pending_uploads', 'by-date');
    },

    async removePendingUpload(id: string) {
        const db = await initDB();
        const tx = db.transaction('pending_uploads', 'readwrite');
        // Using simple delete as per IDB specs
        return tx.store.delete(id);
    },

    async updatePendingUpload(id: string, updates: Partial<PendingUpload>) {
        const db = await initDB();
        const tx = db.transaction('pending_uploads', 'readwrite');
        const store = tx.objectStore('pending_uploads');
        const item = await store.get(id);

        if (!item) return;

        const updatedItem = { ...item, ...updates };
        await store.put(updatedItem);
        await tx.done;
    },

    async clearPendingUploads() {
        const db = await initDB();
        return db.clear('pending_uploads');
    }
};

export type { PendingUpload };
