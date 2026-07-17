import { defineConfig } from 'vitest/config'

// Unit tests run anywhere (node env). Rules/migration tests under tests/rules
// talk to the Firestore emulator and are launched via `npm run test:rules`
// (which wraps vitest in `firebase emulators:exec`, providing Java + the
// FIRESTORE_EMULATOR_HOST env var). They self-skip when that host is absent so
// a plain `npm test` never hangs waiting on an emulator.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
})
