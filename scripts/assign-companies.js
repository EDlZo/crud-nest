#!/usr/bin/env node
// scripts/assign-companies.js
// Usage:
//   # list companies and owners
//   node scripts/assign-companies.js --list
//
//   # assign legacy (missing ownerUserId) companies to a userId
//   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... \
//   FIREBASE_PRIVATE_KEY="-----BEGIN...\n..." node scripts/assign-companies.js --assign --userId d9p71yKiO9U83V6Bo3gZ

const { argv, env } = require('process');
const admin = require('firebase-admin');

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') args.list = true;
    if (a === '--assign') args.assign = true;
    if (a === '--userId' && argv[i + 1]) args.userId = argv[++i];
    if (a === '--only-legacy') args.onlyLegacy = true;
    if (a === '--force') args.force = true;
  }
  return args;
}

async function main() {
  const args = parseArgs();
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
    // ignore double init in dev
  }

  const db = admin.firestore();
  const collection = db.collection(process.env.FIREBASE_COMPANIES_COLLECTION || 'companies');

  const snap = await collection.get();
  const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));

  console.log(`Found ${docs.length} companies`);

  const legacy = docs.filter(d => d.data.ownerUserId === undefined || d.data.ownerUserId === null);
  console.log(`Legacy (missing ownerUserId): ${legacy.length}`);

  if (args.list || (!args.assign && !args.list)) {
    console.log('\nSample companies:');
    docs.slice(0, 20).forEach(d => {
      console.log(`- ${d.id} | ownerUserId=${d.data.ownerUserId} | name=${d.data.name}`);
    });
  }

  if (args.assign) {
    if (!args.userId) {
      console.error('Missing --userId for --assign');
      process.exit(3);
    }

    const toAssign = args.force ? docs : (args.onlyLegacy ? legacy : legacy);
    console.log(`Assigning ${toAssign.length} companies to user ${args.userId}`);

    for (const d of toAssign) {
      try {
        await collection.doc(d.id).update({ ownerUserId: args.userId });
        console.log(`Assigned ${d.id}`);
      } catch (err) {
        console.error(`Failed to assign ${d.id}:`, err.message || err);
      }
    }

    console.log('Done assigning.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
