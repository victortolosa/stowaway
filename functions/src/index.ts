/**
 * Callable Cloud Functions for Stowaway sharing.
 *
 * Why these exist: `publicProfiles` reads are locked to the caller's own doc in
 * firestore.rules to prevent any authenticated user from enumerating every
 * user's email/name/photo. These callables run with the Admin SDK (bypassing
 * rules) and enforce their own authorization, giving us exactly two narrow,
 * server-controlled lookups instead of open client reads:
 *
 *   - resolveUserByEmail:     exact-email -> single profile (for inviting)
 *   - getPlaceMemberProfiles: placeId    -> member profiles (for the member list)
 *
 * Both require an authenticated caller. getPlaceMemberProfiles additionally
 * requires the caller to be a member/owner of the place they ask about.
 */
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

interface PublicProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  updatedAt: number | null;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const requireAuth = (request: CallableRequest): string => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }
  return request.auth.uid;
};

/** Shape a raw publicProfiles doc into the minimal payload the client needs. */
const toPublicProfile = (uid: string, data: FirebaseFirestore.DocumentData): PublicProfile => {
  const updatedAt = data.updatedAt;
  return {
    uid,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    // Firestore Timestamp -> epoch ms, so the client can build a Date.
    updatedAt: updatedAt && typeof updatedAt.toMillis === 'function' ? updatedAt.toMillis() : null,
  };
};

/**
 * Resolve a single user by exact email so an owner can invite them.
 *
 * This is an exact-match lookup requiring the full email address and an
 * authenticated caller — it is not a listing/enumeration endpoint. Returns
 * `{ user: null }` when there is no match (never throws for "not found").
 */
export const resolveUserByEmail = onCall(async (request) => {
  requireAuth(request);

  const email = normalizeEmail(String(request.data?.email ?? ''));
  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'A valid email address is required.');
  }

  const snapshot = await db
    .collection('publicProfiles')
    .where('email', '==', email)
    .limit(1)
    .get();

  const docSnap = snapshot.docs[0];
  if (!docSnap) {
    return { user: null };
  }
  return { user: toPublicProfile(docSnap.id, docSnap.data()) };
});

/**
 * Return the profiles of everyone who is a member of a place. The caller must
 * themselves be a member (or owner) of that place — this is the authorization
 * gate that lets co-members see each other's email/name without opening up
 * publicProfiles to everyone.
 */
export const getPlaceMemberProfiles = onCall(async (request) => {
  const uid = requireAuth(request);

  const placeId = String(request.data?.placeId ?? '');
  if (!placeId) {
    throw new HttpsError('invalid-argument', 'A placeId is required.');
  }

  const placeSnap = await db.collection('places').doc(placeId).get();
  if (!placeSnap.exists) {
    throw new HttpsError('not-found', 'Place not found.');
  }

  const place = placeSnap.data() as FirebaseFirestore.DocumentData;
  const ownerId: string = place.ownerId || place.userId;
  const memberIds: string[] =
    Array.isArray(place.memberIds) && place.memberIds.length > 0 ? place.memberIds : [ownerId];

  if (uid !== ownerId && !memberIds.includes(uid)) {
    throw new HttpsError('permission-denied', 'You are not a member of this place.');
  }

  const uniqueIds = Array.from(new Set([ownerId, ...memberIds])).filter(Boolean);
  if (uniqueIds.length === 0) {
    return { profiles: [] as PublicProfile[] };
  }

  const refs = uniqueIds.map((id) => db.collection('publicProfiles').doc(id));
  const docs = await db.getAll(...refs);
  const profiles = docs
    .filter((docSnap) => docSnap.exists)
    .map((docSnap) => toPublicProfile(docSnap.id, docSnap.data() as FirebaseFirestore.DocumentData));

  return { profiles };
});
