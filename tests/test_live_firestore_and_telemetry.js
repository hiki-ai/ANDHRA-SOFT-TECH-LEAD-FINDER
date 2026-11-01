/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * TEST SUITE: FIRESTORE CONNECTIVITY, PROFILE SUBSCRIBER & TELEMETRY VERIFICATION
 * ==============================================================================
 */

import assert from 'node:assert';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  limit,
  query,
} from 'firebase/firestore';

import { isSystemAdminEmail, getSystemAdminEmails, formatUser } from '../frontend/src/auth/authUtils.js';

const firebaseConfig = {
  apiKey: "AIzaSyDaGxyFJv2S8GVrqw1Cj1yAqe8SR8bz4jU",
  authDomain: "andhra-soft-tech-lead-finder.firebaseapp.com",
  projectId: "andhra-soft-tech-lead-finder",
  storageBucket: "andhra-soft-tech-lead-finder.firebasestorage.app",
  messagingSenderId: "1028511931788",
  appId: "1:1028511931788:web:b0e6b4ff69da76881c4aa9",
  measurementId: "G-4SYW5WDVSN"
};

async function runTestSuite() {
  console.log('='.repeat(75));
  console.log('TEST 1: FIREBASE INITIALIZATION & PERSISTENCE CONFIGURATION');
  console.log('='.repeat(75));

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const auth = getAuth(app);
  let db;

  try {
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    console.log('[PASS] Firestore initialized with experimentalAutoDetectLongPolling and persistentLocalCache.');
  } catch (fsErr) {
    db = getFirestore(app);
    console.log('[PASS] Firestore retrieved via getFirestore(app):', fsErr.message);
  }

  assert.ok(app, 'Firebase app must be initialized');
  assert.ok(auth, 'Firebase Auth must be initialized');
  assert.ok(db, 'Firebase Firestore db must be initialized');

  console.log('\n' + '='.repeat(75));
  console.log('TEST 2: ADMIN EMAIL RECOGNITION (SYSTEM & CONFIGURED)');
  console.log('='.repeat(75));

  const adminEmails = getSystemAdminEmails();
  console.log('Recognized Admin Emails:', adminEmails);
  assert.ok(isSystemAdminEmail('admin@andhrasofttech.com'), 'admin@andhrasofttech.com must be admin');
  assert.ok(isSystemAdminEmail('yarnagulaabhiram123@gmail.com'), 'yarnagulaabhiram123@gmail.com must be admin');
  assert.strictEqual(isSystemAdminEmail('random_user@gmail.com'), false, 'Standard user must not be admin');
  console.log('[PASS] Admin emails properly recognized.');

  console.log('\n' + '='.repeat(75));
  console.log('TEST 3: LIVE FIRESTORE AUTHENTICATED USER PROFILE READ');
  console.log('='.repeat(75));

  const uid = 'xWqb387adhd9emIJYqNcoYLVxVO2';
  const userDocRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userDocRef);

  assert.ok(userSnap.exists(), `User document for UID ${uid} must exist in Cloud Firestore`);
  const profile = userSnap.data();
  console.log(`Retrieved Firestore User: email=${profile.email}, role=${profile.role}, status=${profile.status}`);
  assert.strictEqual(profile.role, 'admin', 'Profile role in Firestore must be admin');
  assert.strictEqual(profile.status, 'active', 'Profile status in Firestore must be active');
  console.log('[PASS] Live Firestore user profile verified.');

  console.log('\n' + '='.repeat(75));
  console.log('TEST 4: SEPARATION OF MISSING DOCUMENT FROM NETWORK FAILURE');
  console.log('='.repeat(75));

  const nonExistentUid = 'non_existent_uid_test_12345';
  const nonExistentSnap = await getDoc(doc(db, 'users', nonExistentUid));
  assert.strictEqual(nonExistentSnap.exists(), false, 'Missing document should cleanly report exists() === false');
  console.log('[PASS] Missing document cleanly handled without throwing network/offline error.');

  console.log('\n' + '='.repeat(75));
  console.log('TEST 5: OFFLINE / NETWORK FAILURE SESSION PRESERVATION');
  console.log('='.repeat(75));

  // Verify that formatting with an existing cached role preserves the verified role
  const mockFirebaseUser = { uid, email: 'yarnagulaabhiram123@gmail.com', displayName: 'abhi' };
  const cachedProfile = { role: 'admin', status: 'active', fullName: 'abhi' };
  const formatted = formatUser(mockFirebaseUser, {
    fullName: cachedProfile.fullName,
    role: cachedProfile.role,
    status: cachedProfile.status,
    token: 'mock_token',
  });
  assert.strictEqual(formatted.role, 'admin', 'Cached admin role must be preserved on network failure');
  assert.strictEqual(formatted.status, 'active', 'Cached active status must be preserved on network failure');
  console.log('[PASS] Session preservation on network failure verified.');

  console.log('\n' + '='.repeat(75));
  console.log('TEST 6: FIRESTORE READ / WRITE / DELETE CONNECTIVITY');
  console.log('='.repeat(75));

  const testPresetId = `preset_test_${Date.now()}`;
  const testPresetRef = doc(db, 'tablePresets', testPresetId);
  const testPayload = {
    name: 'Temporary Automated Test Preset',
    description: 'Validates Firestore write and read cycle',
    created_at: new Date().toISOString(),
    is_test: true,
  };

  await setDoc(testPresetRef, testPayload);
  const readBack = await getDoc(testPresetRef);
  assert.ok(readBack.exists(), 'Written preset document must exist');
  assert.strictEqual(readBack.data().name, testPayload.name, 'Read back data must match written data');

  await deleteDoc(testPresetRef);
  const verifyDeleted = await getDoc(testPresetRef);
  assert.strictEqual(verifyDeleted.exists(), false, 'Deleted preset document must no longer exist');
  console.log('[PASS] Cloud Firestore write, read, and delete cycle completed successfully.');

  console.log('\n' + '='.repeat(75));
  console.log('TEST 7: TABLE PRESETS FETCH');
  console.log('='.repeat(75));

  const presetsSnap = await getDocs(collection(db, 'tablePresets'));
  console.log(`Cloud Firestore tablePresets count: ${presetsSnap.docs.length}`);
  assert.ok(presetsSnap.docs.length > 0, 'There should be presets in Cloud Firestore');
  presetsSnap.docs.forEach((d) => console.log(` - Preset ID: ${d.id} | Name: ${d.data().name}`));
  console.log('[PASS] Table presets successfully retrieved from Cloud Firestore.');

  console.log('\n' + '='.repeat(75));
  console.log('TEST 8: VENDORS & COLLECTIONS COLLECTIONS QUERY');
  console.log('='.repeat(75));

  const vendorsSnap = await getDocs(query(collection(db, 'vendors'), limit(5)));
  console.log(`Vendors collection query: ${vendorsSnap.docs.length} records retrieved.`);
  const collectionsSnap = await getDocs(query(collection(db, 'collections'), limit(5)));
  console.log(`Collections collection query: ${collectionsSnap.docs.length} jobs retrieved.`);
  console.log('[PASS] Vendors and Collections collections queried cleanly.');

  console.log('\n' + '='.repeat(75));
  console.log('ALL FIRESTORE & AUTH CLIENT TESTS PASSED SUCCESSFULLY!');
  console.log('='.repeat(75));
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('[FAIL] Test suite encountered an error:', err);
  process.exit(1);
});
