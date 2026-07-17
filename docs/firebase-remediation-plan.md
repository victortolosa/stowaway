# Firebase remediation plan

## Objective

Stabilize Firestore permissions, inventory queries, deployments, and PWA updates without hiding or orphaning legacy data.

## Current production state

- Authentication and inventory requests no longer load indefinitely.
- Firestore place and encryption-key rules are deployed.
- Inventory queries identify the failing data category.
- Dashboard item loading no longer runs the denied legacy N+1 query.
- Firebase Hosting uses no-cache headers for `index.html` and `sw.js`.
- Hashed assets use immutable caching.

## Status (2026-07-17)

Implemented this pass:

- **Rules CI** (`.github/workflows/firestore-rules.yml`): emulator rules tests on every PR/push touching rules; deploy of `firestore:rules`, `firestore:indexes`, and `storage` on merge to `main`. Separate from the Hosting workflow.
- **`publicProfiles` bandaid**: reads locked to the caller's own doc to stop email/profile enumeration. Share-by-email and cross-member profile display are intentionally disabled until the callable-function fix lands; client lookups degrade to "no match" rather than throwing. Sharing is currently low priority.
- **Test harness**: Vitest + Firebase emulator (`@firebase/rules-unit-testing`). `npm test` runs unit tests; `npm run test:rules` runs the emulator suite (rules boundary + legacy-item migration). Requires a local JRE for the emulator; CI provides one.
- **Migration made testable**: `scripts/backfill-shared-data.mjs` refactored to export its functions and guard the CLI bootstrap; covered by `tests/rules/migration.test.ts`.

Still owner-run (needs production credentials): the legacy-item migration below.

## Priority 1: Migrate legacy items

### Problem

The current item queries require `placeId`, but `ItemSchema` still permits legacy items without it. These records will not appear in inventory results. Operations such as moving a container will also skip them.

### Required work

1. Create a production backup or export of Firestore.
2. Configure service-account credentials locally. Do not commit the credential file.
3. Run the existing migration in dry-run mode:

   ```bash
   FIREBASE_PROJECT_ID=stowaway-eb942 \
   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json \
   node scripts/backfill-shared-data.mjs --dry-run
   ```

4. Review the reported container count, place updates, item updates, and errors.
5. Resolve items with missing or invalid `containerId` values before writing changes.
6. Run the migration without `--dry-run`:

   ```bash
   FIREBASE_PROJECT_ID=stowaway-eb942 \
   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json \
   node scripts/backfill-shared-data.mjs
   ```

7. Run the dry run again. It should report zero remaining updates.
8. Verify several older items in the Dashboard, item list, container view, and search.

### Follow-up changes

After migration verification:

- Make `ItemSchema.placeId` required.
- Remove remaining code and rule branches for items without `placeId`.
- Reject item creation without a valid `placeId`.
- Add a data-integrity check that reports items whose container and `placeId` disagree.

### Acceptance criteria

- Every item has a valid `placeId`.
- Every item references a container in the same place.
- Moving a container updates every child item.
- No older items disappear from lists or search.

## Priority 1: Correct atomic encryption-key rules

### Problem

Creating a place writes the place and its encryption key in one batch. The key-create rule currently uses `get()`, which evaluates the parent place before the batch is committed.

### Required work

1. Add a helper that validates the parent place using `getAfter()`.
2. Use that helper for `places/{placeId}/keys/{keyDoc}` creation.
3. Keep key reads limited to place members.
4. Keep key updates and deletion limited to the place owner.
5. Add emulator tests for:

   - Owner creates a place and key in one batch.
   - Non-owner cannot create or replace a key.
   - Member can read a key.
   - Non-member cannot read a key.

6. Deploy the rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

### Acceptance criteria

- A new place and key can be created atomically.
- Unauthorized users cannot read or mutate encryption keys.
- Existing place creation continues to work after deployment.

## Priority 1: Deploy Firestore rules through CI

### Problem

The GitHub Actions workflow deploys Hosting only. Changes to `firestore.rules` can be merged without reaching production.

### Required work

1. Create a dedicated rules deployment job or workflow.
2. Trigger it when either file changes:

   - `firestore.rules`
   - `firebase.json`

3. Give its service account only the permissions required to release Firestore rules.
4. Compile and test rules before deployment.
5. Keep Hosting and rules deployments as separate jobs so a rules failure does not produce an ambiguous Hosting result.
6. Protect the production environment with GitHub environment controls if available.

### Acceptance criteria

- A merged rules change is compiled and deployed automatically.
- A compilation or test failure blocks the rules release.
- Workflow logs clearly distinguish Hosting and Firestore deployments.
- Production rules can be traced to a Git commit.

## Priority 2: Use one service-worker registration

### Problem

The service worker is registered in both `main.tsx` and `ReloadPrompt.tsx`. Duplicate registration complicates update detection and stale-bundle recovery.

### Required work

1. Choose one registration owner.
2. Prefer the `useRegisterSW` flow because it already controls the update prompt.
3. Remove the other registration.
4. Ensure registration still occurs for public routes if offline login-page support is required.
5. Test these scenarios:

   - First visit.
   - Existing PWA receives a new release.
   - User accepts the update.
   - User dismisses the update.
   - Installed PWA is reopened after deployment.
   - A referenced lazy-loaded chunk is unavailable.

### Acceptance criteria

- Only one service-worker registration exists.
- New releases reliably show one update prompt.
- Accepting the prompt loads the new asset hashes.
- `index.html` and `sw.js` revalidate on every request.

## Priority 2: Improve timeout behavior

### Problem

`withTimeout()` rejects after the deadline but does not cancel the underlying Firebase operation. Repeated retries can leave multiple reads running.

### Required work

1. Keep timeout errors distinct from permission and validation errors.
2. Prevent duplicate retries while a previous request may still be active.
3. Log the query category, duration, Firebase error code, and online status without logging inventory content or encryption keys.
4. Retry only transient failures with bounded exponential backoff.
5. Do not retry permission errors automatically.

### Acceptance criteria

- Permission errors appear immediately and are not retried.
- Temporary network errors receive a bounded retry.
- Pressing retry cannot start an uncontrolled number of concurrent reads.
- The UI never displays an indefinite loader.

## Testing requirements

Add Firebase Emulator Suite tests covering:

- Owner, editor, viewer, and non-member access.
- Owned and shared place queries.
- Container and item list queries constrained by `placeId`.
- Encryption-key reads and atomic creation.
- Item creation, update, deletion, and container moves.
- Legacy migration integrity.

Add application tests covering:

- Auth initialization success, failure, and timeout.
- Places, containers, and items permission errors.
- Retry behavior.
- Empty inventories.
- PWA update behavior.

## Recommended implementation order

1. Export or back up Firestore.
2. Dry-run and execute the legacy-item migration.
3. Verify data integrity and make `placeId` required.
4. Add Firestore emulator tests.
5. Correct the atomic key-creation rule with `getAfter()`.
6. Deploy and verify Firestore rules.
7. Add the dedicated CI rules deployment.
8. Consolidate service-worker registration.
9. Improve request cancellation, retry policy, and diagnostics.
10. Run the full regression checklist and deploy Hosting.

## Deployment checklist

```bash
npm ci
npm run lint
npm run type-check
npm run build
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

After deployment:

1. Confirm `index.html` and `sw.js` return `no-cache, no-store, must-revalidate`.
2. Confirm hashed assets return `public, max-age=31536000, immutable`.
3. Sign in as an owner and a shared member.
4. Verify places, containers, items, search, moves, and creation.
5. Confirm the production rules release and Hosting release correspond to the intended commit.

## Rollback guidance

- Hosting: roll back to the last known-good Firebase Hosting release.
- Rules: redeploy the last known-good `firestore.rules` revision.
- Migration: restore from the pre-migration export if integrity checks fail.
- Never relax collection reads to all authenticated users as a temporary workaround.

