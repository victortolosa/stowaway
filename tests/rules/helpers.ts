import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const rulesPath = resolve(here, '../../firestore.rules')

export const PROJECT_ID = 'stowaway-rules-test'

/**
 * The rules tests require the Firestore emulator. `npm run test:rules` wraps
 * vitest in `firebase emulators:exec`, which sets FIRESTORE_EMULATOR_HOST.
 * When it is absent (e.g. a bare `npm test`), callers should skip.
 */
export const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

export async function makeTestEnv(): Promise<RulesTestEnvironment> {
  const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':')
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(rulesPath, 'utf8'),
      host,
      port: Number(portStr),
    },
  })
}
