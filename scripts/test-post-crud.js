const { config } = require('dotenv');
const jwt = require('jsonwebtoken');
config({ path: './.env' });

const secret = process.env.JWT_SECRET || 'dev-secret';
const token = jwt.sign({ userId: process.argv[2] || 'test-user-1', email: 'test-user+1@example.com', role: 'admin', tokenVersion: 0 }, secret, { expiresIn: '7d' });

async function main() {
  const url = process.env.BACKEND_URL || 'http://localhost:3000';
  const payload = {
    firstName: 'AutoTest',
    lastName: 'Prov',
    email: 'autotest@example.com',
    phone: '0000000000',
    address: 'ตัวอย่าง ต.สีลม อ.บางรัก จ.กรุงเทพมหานคร',
    province: 'กรุงเทพมหานคร',
    amphoe: 'บางรัก',
    tambon: 'สีลม',
  };

  try {
    const res = await fetch(`${url}/cruds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (err) {
    console.error('Request failed', err.message);
    process.exit(1);
  }
}

main();
