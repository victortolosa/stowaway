# Stowaway Code Review — February 12, 2026

## CRITICAL

### 1. Race condition in place creation encryption
**File:** `src/services/firebaseService.ts:145-177`

The place document is created with a plaintext name, then encrypted in a separate update. If the app crashes between these operations, the name stays unencrypted in Firestore. Fix: encrypt the name *before* the initial `addDoc`.

### 2. Missing transactions for multi-document operations
**File:** `src/services/firebaseService.ts:975-982`

`moveContainer()` updates child items in a loop without a batch/transaction. If the app crashes mid-loop, items end up split across places. Same issue in `deleteGroup()` (line 1177-1184). Use `writeBatch()` or `runTransaction()`.

### 3. N+1 query in `getPlaceItems()`
**File:** `src/services/firebaseService.ts:727-757`

For legacy items without `placeId`, the code fetches all containers then queries items per container (1 + N queries). A place with 20 containers triggers 21 Firestore reads. Run a one-time migration to backfill `placeId` on all items.

### 4. Overly permissive user profile read rule
**File:** `firestore.rules:74`

Any authenticated user can read *any* user's profile (email, photo). Change to: `allow read: if isAuthenticated() && request.auth.uid == userId;`

### 5. Production debug logging always enabled
**File:** `src/lib/firebase.ts:29`

```typescript
if (import.meta.env.PROD || true) { // ← || true makes this always log
```

This logs Firebase config prefixes/suffixes in production. Change to `import.meta.env.DEV`.

---

## HIGH

### 6. Encryption key cache never evicted
**File:** `src/lib/encryption.ts:5,37-47`

`keyCache` is a `Map<string, CryptoKey>` that grows unbounded. Keys are only cleared on logout. Add TTL-based eviction or a size limit.

### 7. `extractable: true` on crypto keys
**File:** `src/lib/encryption.ts:20`

DEKs are generated with `extractable: true`. If they don't need to be exported after initial storage, set this to `false` to prevent extraction from memory.

### 8. Auth state listener never unsubscribed
**File:** `src/lib/encryption.ts:231-235`

`auth.onAuthStateChanged()` return value (unsubscriber) is discarded. Over time, multiple listeners accumulate.

### 9. Zod `.parse()` without error handling
**File:** `src/services/firebaseService.ts` — 26+ call sites

Every Firestore read uses `.parse()` which throws on invalid data. One corrupt document crashes the whole page. Use `.safeParse()` and handle validation errors gracefully.

### 10. State update during render in BreadcrumbContext
**File:** `src/contexts/BreadcrumbContext.tsx:20-23`

```tsx
if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    setItems([]) // state update during render
}
```

This violates React rules. Move to `useEffect`.

### 11. Memory leak in AudioRecorder
**File:** `src/components/AudioRecorder.tsx:244-281`

`mediaRecorderRef` is not stopped on unmount if recording is active. Stream cleanup only happens in `onstop`, not in the cleanup effect.

### 12. Memory leak in useImageCompression
**File:** `src/hooks/useImageCompression.ts:56-60`

`setTimeout(() => setProgress(0), 500)` is never cleared on unmount.

### 13. `useRecentItems` limitCount not in query key
**File:** `src/hooks/queries/useAllItems.ts:28-41`

Calling `useRecentItems(50)` then `useRecentItems(20)` returns the cached result from the first call. Include `limitCount` in the query key.

---

## MEDIUM

### 14. Missing Zod schema validation
**File:** `src/schemas/firestore.ts`

- `name` fields have no `.min(1)` or `.max()` constraints (lines 20, 37, 48, 68)
- `email` field has no `.email()` validation (line 144)
- `color`/`icon` fields have no format validation

### 15. Type-schema inconsistency: nullable vs optional
**Files:** `src/types/index.ts` + `src/schemas/firestore.ts`

Fields like `groupId` are typed `string | null` but schemas use `.nullable().optional()` which adds `undefined` as a possible value. Pick one approach.

### 16. Container has both `photoUrl` and `photos`
**File:** `src/types/index.ts:38,44`

Ambiguous which is canonical. Service code falls back: `container.photoUrl || container.photos?.[0]`. Consolidate or document clearly.

### 17. Duplicate `SearchOptions` interface and JSDoc
**File:** `src/hooks/useSearch.ts:7-37`

The interface and its JSDoc are copy-pasted twice.

### 18. Zustand toast timeout not cancellable
**File:** `src/store/ui.ts:21-27`

`setTimeout` in `showToast` can't be cancelled. Rapid toasts stack up stale timeouts.

### 19. `getAccessibleRecentActivity()` over-fetches
**File:** `src/services/firebaseService.ts:1560-1616`

Fetches `limitCount` per place (5 places x 50 = 250 records), deduplicates, then limits to 50. Also decrypts all 250+ in parallel, causing CPU spikes.

### 20. No optimistic updates anywhere

All mutations follow: `await serviceCall()` → `invalidateQueries()`. Users see loading spinners for every action. Consider `useMutation` with optimistic cache updates for common operations.

### 21. Unencrypted personal groups
**File:** `src/services/firebaseService.ts:1040-1084`

Groups with `placeId === null` skip encryption entirely.

### 22. Member management without transactions
**File:** `src/services/firebaseService.ts:285-315`

`addPlaceMember`, `updatePlaceMemberRole`, `removePlaceMember` do read-then-write without atomicity. Race conditions can corrupt member lists.

---

## LOW

### 23. Accessibility gaps

Icon-only buttons in `BottomTabBar`, `ThemeToggle`, and `Button` lack `aria-label`. `ImageCarousel` pagination indicators are unlabeled.

### 24. Large page components

`PlaceDetail.tsx`, `Container.tsx`, and `Item.tsx` each handle editing, deleting, modals, activity, and permissions. Extract modal state into custom hooks.

### 25. Inline safe-area styles

Repeated across `Layout`, `BottomTabBar`, `GroupFilter`, `ParallaxRowList`. Extract to a shared CSS utility or hook.

### 26. `useOnClickOutside` usage

5 files pass `[setShowAddMenu]` as useCallback deps, but setState setters are already stable. Should be `[]`.

### 27. Hard-coded collection names

`'places'`, `'containers'`, `'items'` scattered throughout the service layer. Extract to constants.

### 28. Encryption failures silently return encrypted strings
**File:** `src/lib/encryption.ts:105-108`

Users could see `enc:...` values in the UI with no indication something went wrong.

### 29. No key rotation mechanism

If a DEK is compromised, there's no way to re-encrypt a place's data with a new key.

### 30. Two ESLint configs exist

`.eslintrc.cjs` (legacy) and `eslint.config.js` (flat config). Remove the legacy one.

---

## Summary

| Category                        | Critical | High | Medium | Low |
|---------------------------------|----------|------|--------|-----|
| Data integrity / race conditions | 2        | 1    | 1      | -   |
| Security                        | 2        | 2    | 2      | -   |
| Performance                     | 1        | -    | 2      | -   |
| Memory leaks                    | -        | 3    | 1      | -   |
| Type safety / validation        | -        | 2    | 3      | -   |
| React patterns                  | -        | 1    | 1      | 3   |
| Code quality                    | -        | -    | 1      | 4   |

## Top 3 Recommendations

1. Wrap multi-document writes in batches/transactions (place creation, moves, deletes, member management)
2. Fix the Firestore user profile read rule and the `|| true` debug logging
3. Use `.safeParse()` for Zod validation to prevent a single bad document from crashing pages
