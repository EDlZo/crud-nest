const { config } = require('dotenv');
const jwt = require('jsonwebtoken');

config({ path: './.env' });

const secret = process.env.JWT_SECRET || 'dev-secret';

const userId = process.argv[2] || 'test-user-1';
const payload = {
  sub: userId,
  email: 'test-user+1@example.com',
  role: 'admin',
  tokenVersion: 0,
};

const token = jwt.sign(payload, secret, { expiresIn: '7d' });
console.log(token);
