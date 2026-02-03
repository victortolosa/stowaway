# Offline Support Implementation Plan

## Goal
Make the application robust for low signal or offline modes. Users should be able to view their inventory and make changes (add/edit items) while offline. Changes should sync when the connection is restored.

## User Review Required
> [!WARNING]
> Firestore Persistence needs to be enabled carefully. Multi-tab persistence can sometimes cause issues, but single-tab persistence is generally safe.
> **Non-blocking Uploads**: Uploads will not block the user flow. They will be "optimistically" saved and synced in the background.

---

## Sprint 1: Core Offline Infrastructure
**Goal:** Enable basic offline read/write and background image queuing.

### Epic 1: Firestore & PWA Configuration
#### [MODIFY] [firebase.ts](file:///Users/victortolosa/Documents/Repos/stowaway/src/lib/firebase.ts)
- Enable Firestore offline persistence (`enableIndexedDbPersistence` or new API).

#### [MODIFY] [vite.config.ts](file:///Users/victortolosa/Documents/Repos/stowaway/vite.config.ts)
- Clean up Workbox config to avoid conflicting with Firestore SDK.
- Ensure app shell (HTML/JS/CSS) is effectively cached-first.

### Epic 2: Background Upload Foundation
#### [NEW] [offlineStorage.ts](file:///Users/victortolosa/Documents/Repos/stowaway/src/lib/offlineStorage.ts)
- Implement `idb` store for `pending_uploads`.
- Methods: `addPendingUpload`, `getPendingUploads`, `removePendingUpload`.

#### [NEW] [useNetworkStatus.ts](file:///Users/victortolosa/Documents/Repos/stowaway/src/hooks/useNetworkStatus.ts)
- Hook to subscribe to `window.online` / `window.offline`.

#### [NEW] [useBackgroundSync.ts](file:///Users/victortolosa/Documents/Repos/stowaway/src/hooks/useBackgroundSync.ts)
- Hook that listens for `online` status.
- Triggers processing of the IDB queue.
- Updates Firestore documents with real URLs after successful upload.

---

## Sprint 2: UX, Robustness & Observability
**Goal:** Make the offline experience seamless, visible, and error-tolerant.

### Epic 3: Optimistic UI & Creation Flow
#### [MODIFY] [firebaseService.ts](file:///Users/victortolosa/Documents/Repos/stowaway/src/services/firebaseService.ts)
- Update `uploadImage` / `uploadAudio` to handle offline state:
  - Save to IDB.
  - Return local blob URL or placeholder.
- Update `createItem` / `createContainer` to accept placeholder URLs.

#### [MODIFY] [CreateItemModal.tsx](file:///Users/victortolosa/Documents/Repos/stowaway/src/components/CreateItemModal.tsx)
- Remove `await` for uploads (or rely on the service's "instant" offline return).
- Ensure UI closes immediately and shows the new item in the list (Optimistic Update).

### Epic 4: Visual Feedback & Management
#### [NEW] [components/OfflineIndicator.tsx](file:///Users/victortolosa/Documents/Repos/stowaway/src/components/OfflineIndicator.tsx)
- Visual cues for "Offline", "Syncing", "Synced".
- Integrate into `Layout.tsx` or `BottomTabBar`.

#### [NEW] [components/SyncStatus.tsx](file:///Users/victortolosa/Documents/Repos/stowaway/src/components/SyncStatus.tsx)
- Dashboard or Settings view showing number of pending uploads.
- "Retry" / "Clear" controls for failed uploads.

#### [NEW] [settings/OfflineSettings.tsx](file:///Users/victortolosa/Documents/Repos/stowaway/src/pages/settings/OfflineSettings.tsx)
- "Offline & Sync" help section explaining behaviors.

### Epic 5: Reliability & Limits
#### [MODIFY] [UseBackgroundSync.ts](file:///Users/victortolosa/Documents/Repos/stowaway/src/hooks/useBackgroundSync.ts)
- Add telemetry/logging: `console.log('[Sync] Queue size: 5', 'Failures: 0')`.
- Handle storage quotas (try/catch IDB writes).

---

## Verification Plan
### Manual Verification
1.  **Offline Read**: Load app, go airplane mode, navigate pages. -> *Expect content to load.*
2.  **Offline Write**: Create Item with Photo while offline. -> *Expect creation success, item appears in list with blob image.*
3.  **Sync**: Turn internet back on. -> *Expect "Syncing" indicator, followed by "Synced". Check Console for upload logs.*
4.  **Persistence**: Refresh page while offline. -> *Expect app to load shell and data.*
5.  **Conflict**: (Advanced) Edit item on device A (offline), edit same item on device B (online). Connect device A. -> *Expect Last-Write-Wins (Device A overwrites B).*
