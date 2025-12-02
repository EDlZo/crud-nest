import { config } from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    'Missing Firebase credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
  );
}

const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

export const db = getFirestore(app);
