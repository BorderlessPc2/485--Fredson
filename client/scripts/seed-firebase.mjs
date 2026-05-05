import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyCIP3Bo8aY6XESo8-t-d-vwf8QpHJ0_Rfk',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'fredson-bf42c.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID ?? 'fredson-bf42c',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'fredson-bf42c.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '1063290426668',
  appId: process.env.VITE_FIREBASE_APP_ID ?? '1:1063290426668:web:0bef19be7ebd4ce5500889',
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-G68ZHLEMD8',
};

const SEED_USERS = [
  { name: 'Admin 485', email: 'admin@485.com', password: 'Admin@485' },
  { name: 'Operador 485', email: 'operador@485.com', password: 'Operador@485' },
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function upsertUserProfile(uid, name, email, role) {
  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      name,
      email,
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function ensureUser(user, role) {
  let credential;

  try {
    credential = await createUserWithEmailAndPassword(auth, user.email, user.password);
    console.log(`created user: ${user.email}`);
  } catch (error) {
    if (error?.code === 'auth/email-already-in-use') {
      credential = await signInWithEmailAndPassword(auth, user.email, user.password);
      console.log(`user already exists: ${user.email}`);
    } else {
      throw error;
    }
  }

  await upsertUserProfile(credential.user.uid, user.name, user.email, role);
  await signOut(auth);
}

async function seed() {
  try {
    await ensureUser(SEED_USERS[0], 'admin');
    await ensureUser(SEED_USERS[1], 'operator');

    await setDoc(
      doc(db, 'app_meta', 'seed'),
      {
        projectId: firebaseConfig.projectId,
        seededAt: serverTimestamp(),
        seededBy: 'firebase-seed-script',
      },
      { merge: true }
    );

    console.log('\nseed complete');
    console.log('users:');
    for (const user of SEED_USERS) {
      console.log(`- ${user.email} / ${user.password}`);
    }
    process.exit(0);
  } catch (error) {
    console.error('seed failed:', error);
    process.exit(1);
  }
}

seed();
