const { config } = require('dotenv');
const admin = require('firebase-admin');

config({ path: './.env' });

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
  console.error('Missing Firebase credentials in .env');
  process.exit(2);
}

try {
  admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }) });
} catch (e) {}

const db = admin.firestore();

async function main() {
  const uid = 'test-user-1';
  const data = { email: 'test-user+1@example.com', role: 'admin', tokenVersion: 0 };
  await db.collection(process.env.FIREBASE_USERS_COLLECTION || 'users').doc(uid).set(data);
  console.log('Created test user:', uid);
}

main().catch(e => { console.error(e); process.exit(1); });
