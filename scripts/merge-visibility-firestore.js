#!/usr/bin/env node
// scripts/merge-visibility-firestore.js
// Usage:
// DOTENV_CONFIG_PATH=.env node -r dotenv/config scripts/merge-visibility-firestore.js

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

  const doc = await ref.get();
  let current = {};
  if (doc.exists) current = doc.data();

  console.log('Current visibility doc:', JSON.stringify(current, null, 2));

  const defaults = {
    superadmin: { dashboard: true, companies: true, admin_users: true, visibility: true, activities: true, deals: true },
    admin: { dashboard: true, companies: true, admin_users: false, visibility: false, activities: true, deals: true },
    guest: { dashboard: true, companies: true, admin_users: false, visibility: false, activities: false, deals: false },
  };

  // Normalize existing values to booleans where possible and merge defaults for missing keys
  const merged = { ...(current || {}) };
  ['superadmin', 'admin', 'guest'].forEach((role) => {
    merged[role] = { ...(merged[role] || {}) };
    // normalize values
    Object.keys(merged[role]).forEach((k) => {
      const v = merged[role][k];
      if (typeof v === 'string') {
        const lower = v.toLowerCase();
        if (lower === 'true') merged[role][k] = true;
        else if (lower === 'false') merged[role][k] = false;
        else merged[role][k] = Boolean(v);
      }
    });
    // merge defaults for missing keys
    Object.keys(defaults[role]).forEach((k) => {
      if (typeof merged[role][k] === 'undefined') merged[role][k] = defaults[role][k];
    });
  });

  await ref.set(merged, { merge: true });
  const saved = await ref.get();
  console.log('Saved visibility doc:', JSON.stringify(saved.data(), null, 2));
  console.log('\nDone. Visibility keys merged into Firestore.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
