## โปรเจ็กต์ CRUD + Firebase

เว็บฟอร์ม React (Vite) + NestJS API สำหรับบันทึกข้อมูลติดต่อไปยัง Firebase Firestore

## โครงสร้าง

- `src/**` – NestJS API (เรียก Firestore ผ่าน service account)
- `client/**` – React + Vite UI
- `dist/` – ไฟล์ build หลังรัน `npm run build`

## การตั้งค่า Backend

1. คัดลอก `env.example` เป็น `.env`
2. ใส่ค่า **Firebase** (`FIREBASE_*`) และ **JWT** (`JWT_SECRET`, `JWT_EXPIRES_IN`) ให้เรียบร้อย
3. ติดตั้ง dependencies และรัน Nest

```bash
npm install
npm run start:dev
```

## การตั้งค่า Frontend

Vite จะอ่านตัวแปร `VITE_API_BASE_URL`

- Development (proxy หา Nest ที่ localhost:3000): ปล่อยว่างไว้ก็ได้
- Production/ทดสอบบนเครื่องอื่น: ใส่ URL ของ backend ที่ออนไลน์ เช่น `https://crud-nest.your-domain.com`

ตัวอย่างคำสั่ง build พร้อมตั้งค่า:

```bash
cd client
set VITE_API_BASE_URL=https://crud-nest.your-domain.com && npm run build
```

ไฟล์ที่ได้อยู่ใน `client/dist` นำไปฝากบน hosting ใดก็ได้

> ถ้า deploy NestJS แล้วเสิร์ฟ React ผ่าน Nest (`npm run build` จาก root) ให้ตั้ง `VITE_API_BASE_URL` เป็น domain ของ Nest เพื่อให้ทุกเครื่องเรียก API ตัวเดียวกัน ไม่ใช่ `localhost`

## การใช้งานระบบ Login/Register

- Frontend เพิ่มหน้า `/login` และ `/register`
- Backend มี endpoint ใหม่:
  - `POST /auth/register` รับ `{ email, password }` คืน JWT
  - `POST /auth/login` รับ `{ email, password }` คืน JWT
- ทุกคำขอที่ `/cruds/**` ต้องส่ง header `Authorization: Bearer <token>`
- React จะเก็บ token ใน `localStorage` (ค่า `crud-token`) และแนบให้อัตโนมัติเมื่อใช้งานหน้า CRUD

หาก deploy ไป Netlify, Render ฯลฯ ให้สร้างบัญชี (register) บน backend ตัวเดียวกันก่อน จากนั้น login ได้ทันที

## Deploy แบบ All-in-one

1. ตั้งค่า `.env` (backend) + `VITE_API_BASE_URL`
2. รัน `npm run build` – script จะ build Nest + Frontend แล้วคัดไฟล์ไปยัง `dist/client`
3. รัน `npm run start:prod` หรือ deploy container/server ตามสะดวก

## ทดสอบ

```bash
npm run test
npm run test:e2e
```
