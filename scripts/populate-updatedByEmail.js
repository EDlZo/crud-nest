// Migration script: populate `updatedByEmail` for existing `contacts` documents
// Usage: set environment variable GOOGLE_APPLICATION_CREDENTIALS to your service account JSON,
// then run: node scripts/populate-updatedByEmail.js

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Please set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function run() {
  console.log('Scanning contacts collection...');
  const snapshot = await db.collection('contacts').get();
  console.log(`Found ${snapshot.size} documents`);
  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.updatedByEmail) {
      // Try to use createdByEmail or ownerEmail or updatedBy
      const candidate = data.createdByEmail || data.ownerEmail || data.updatedBy || null;
      if (candidate) {
        await doc.ref.update({ updatedByEmail: candidate });
        updated++;
      }
    }
  }
  console.log(`Updated ${updated} documents`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(2);
});
