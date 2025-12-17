const { config } = require('dotenv');
const admin = require('firebase-admin');

config({ path: './.env' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase credentials in .env');
  process.exit(2);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
} catch (e) {
  // ignore if already initialized
}

const db = admin.firestore();
const collection = process.env.FIREBASE_COLLECTION || 'contacts';

async function main() {
  const timestamp = new Date().toISOString();
  const payload = {
    firstName: 'Test',
    lastName: 'Writer',
    email: `test+${Date.now()}@example.com`,
    phone: '0000000000',
    address: 'ทดสอบ 1',
    province: 'ทดสอบจังหวัด',
    amphoe: 'ทดสอบอำเภอ',
    tambon: 'ทดสอบตำบล',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const docRef = await db.collection(collection).add(payload);
  console.log('Wrote doc id:', docRef.id);
  const doc = await docRef.get();
  console.log('Doc data:', doc.data());
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
