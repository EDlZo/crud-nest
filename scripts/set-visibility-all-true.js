#!/usr/bin/env node
// scripts/set-visibility-all-true.js
// Usage:
// DOTENV_CONFIG_PATH=.env node -r dotenv/config scripts/set-visibility-all-true.js

const admin = require('firebase-admin');
const { env } = require('process');

async function main() {
  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = env.FIREBASE_PRIVATE_KEY;
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, '\n') : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase credentials in env. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    process.exit(2);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } catch (err) {
    // ignore double init
  }

  const db = admin.firestore();
  const settingsCollection = db.collection(process.env.FIREBASE_SETTINGS_COLLECTION || 'settings');
  const ref = settingsCollection.doc('visibility');

  const allTrue = {
    superadmin: { dashboard: true, companies: true, admin_users: true, visibility: true, activities: true, deals: true },
    admin: { dashboard: true, companies: true, admin_users: true, visibility: true, activities: true, deals: true },
    guest: { dashboard: true, companies: true, admin_users: true, visibility: true, activities: true, deals: true },
  };

  await ref.set(allTrue, { merge: true });
  const saved = await ref.get();
  console.log('Saved visibility doc:', JSON.stringify(saved.data(), null, 2));
  console.log('\nDone. All roles now have visibility enabled for all pages.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
