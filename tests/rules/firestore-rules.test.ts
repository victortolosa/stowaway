import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { emulatorAvailable, makeTestEnv } from './helpers'

const OWNER = 'owner-uid'
const EDITOR = 'editor-uid'
const VIEWER = 'viewer-uid'
const OUTSIDER = 'outsider-uid'
const PLACE_ID = 'place-1'
const CONTAINER_ID = 'container-1'
const ITEM_ID = 'item-1'

const describeRules = emulatorAvailable ? describe : describe.skip
if (!emulatorAvailable) {
  console.warn('[rules] FIRESTORE_EMULATOR_HOST not set — skipping. Run `npm run test:rules`.')
}

describeRules('firestore.rules', () => {
  let testEnv: RulesTestEnvironment

  beforeAll(async () => {
    testEnv = await makeTestEnv()
  })

  afterAll(async () => {
    await testEnv?.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
    // Seed a place with owner/editor/viewer, plus a container and item, using
    // admin (rules-bypassing) context so tests start from a known state.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'places', PLACE_ID), {
        userId: OWNER,
        ownerId: OWNER,
        name: 'enc:home',
        type: 'home',
        memberIds: [OWNER, EDITOR, VIEWER],
        memberRoles: { [OWNER]: 'owner', [EDITOR]: 'editor', [VIEWER]: 'viewer' },
      })
      await setDoc(doc(db, 'places', PLACE_ID, 'keys', 'dek'), { key: 'base64key' })
      await setDoc(doc(db, 'containers', CONTAINER_ID), {
        placeId: PLACE_ID,
        name: 'enc:box',
      })
      await setDoc(doc(db, 'items', ITEM_ID), {
        placeId: PLACE_ID,
        containerId: CONTAINER_ID,
        name: 'enc:widget',
      })
      await setDoc(doc(db, 'publicProfiles', OWNER), { uid: OWNER, email: 'owner@example.com' })
      await setDoc(doc(db, 'publicProfiles', OUTSIDER), { uid: OUTSIDER, email: 'outsider@example.com' })
    })
  })

  const ctxFor = (uid: string | null) =>
    (uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext()).firestore()

  describe('places', () => {
    it('lets a member read the place', async () => {
      await assertSucceeds(getDoc(doc(ctxFor(VIEWER), 'places', PLACE_ID)))
    })

    it('denies a non-member reading the place', async () => {
      await assertFails(getDoc(doc(ctxFor(OUTSIDER), 'places', PLACE_ID)))
    })

    it('denies an editor changing membership/roles', async () => {
      await assertFails(
        updateDoc(doc(ctxFor(EDITOR), 'places', PLACE_ID), {
          memberIds: [OWNER, EDITOR, VIEWER, OUTSIDER],
        })
      )
    })

    it('lets an editor update a non-membership field', async () => {
      await assertSucceeds(updateDoc(doc(ctxFor(EDITOR), 'places', PLACE_ID), { name: 'enc:home2' }))
    })

    it('denies an editor deleting the place (owner-only)', async () => {
      await assertFails(deleteDoc(doc(ctxFor(EDITOR), 'places', PLACE_ID)))
    })

    it('lets the owner delete the place', async () => {
      await assertSucceeds(deleteDoc(doc(ctxFor(OWNER), 'places', PLACE_ID)))
    })
  })

  describe('encryption keys', () => {
    it('lets a member read the DEK', async () => {
      await assertSucceeds(getDoc(doc(ctxFor(EDITOR), 'places', PLACE_ID, 'keys', 'dek')))
    })

    it('denies a non-member reading the DEK', async () => {
      await assertFails(getDoc(doc(ctxFor(OUTSIDER), 'places', PLACE_ID, 'keys', 'dek')))
    })

    it('denies a non-owner overwriting the DEK', async () => {
      await assertFails(setDoc(doc(ctxFor(EDITOR), 'places', PLACE_ID, 'keys', 'dek'), { key: 'evil' }))
    })
  })

  describe('containers', () => {
    it('lets a member read a container', async () => {
      await assertSucceeds(getDoc(doc(ctxFor(VIEWER), 'containers', CONTAINER_ID)))
    })

    it('denies a viewer updating a container (editor-only)', async () => {
      await assertFails(updateDoc(doc(ctxFor(VIEWER), 'containers', CONTAINER_ID), { name: 'enc:box2' }))
    })

    it('lets an editor update a container', async () => {
      await assertSucceeds(updateDoc(doc(ctxFor(EDITOR), 'containers', CONTAINER_ID), { name: 'enc:box2' }))
    })

    it('denies a non-member reading a container', async () => {
      await assertFails(getDoc(doc(ctxFor(OUTSIDER), 'containers', CONTAINER_ID)))
    })
  })

  describe('items', () => {
    it('lets a member read an item scoped by placeId', async () => {
      await assertSucceeds(getDoc(doc(ctxFor(VIEWER), 'items', ITEM_ID)))
    })

    it('denies a non-member reading an item', async () => {
      await assertFails(getDoc(doc(ctxFor(OUTSIDER), 'items', ITEM_ID)))
    })

    it('denies a viewer creating an item', async () => {
      await assertFails(
        setDoc(doc(ctxFor(VIEWER), 'items', 'item-2'), {
          placeId: PLACE_ID,
          containerId: CONTAINER_ID,
          name: 'enc:new',
        })
      )
    })

    it('lets an editor create an item with a valid placeId', async () => {
      await assertSucceeds(
        setDoc(doc(ctxFor(EDITOR), 'items', 'item-3'), {
          placeId: PLACE_ID,
          containerId: CONTAINER_ID,
          name: 'enc:new',
        })
      )
    })

    it('denies creating an item without a placeId (now required)', async () => {
      await assertFails(
        setDoc(doc(ctxFor(EDITOR), 'items', 'item-4'), {
          containerId: CONTAINER_ID,
          name: 'enc:new',
        })
      )
    })
  })

  describe('publicProfiles (bandaid lockdown)', () => {
    it('lets a user read only their own profile', async () => {
      await assertSucceeds(getDoc(doc(ctxFor(OWNER), 'publicProfiles', OWNER)))
    })

    it('denies reading another user profile by id', async () => {
      await assertFails(getDoc(doc(ctxFor(OWNER), 'publicProfiles', OUTSIDER)))
    })

    it('denies enumerating profiles by email (the harvest vector)', async () => {
      const q = query(
        collection(ctxFor(OWNER), 'publicProfiles'),
        where('email', '==', 'outsider@example.com')
      )
      await assertFails(getDocs(q))
    })
  })
})
