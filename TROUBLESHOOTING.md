# 🔧 คู่มือแก้ปัญหา (Troubleshooting Guide)

## ❌ Error: "Unexpected token '<', "<!doctype "... is not valid JSON"

### สาเหตุ:
Error นี้เกิดเมื่อ API endpoint ส่ง HTML กลับมาแทน JSON ซึ่งมักเกิดจาก:
1. **Backend ไม่ได้รัน** - API server ยังไม่ทำงาน
2. **Proxy configuration ไม่ครบ** - Vite dev server ไม่ได้ proxy request ไปที่ backend
3. **Route ไม่ถูกต้อง** - API endpoint ไม่มีใน backend

### วิธีแก้ไข:

#### 1. ตรวจสอบว่า Backend รันอยู่หรือไม่

```bash
# ตรวจสอบว่า backend รันอยู่ที่ port 3000
curl http://localhost:3000/companies

# หรือเปิด browser ไปที่
http://localhost:3000
```

**ถ้ายังไม่รัน:**
```bash
# Terminal 1: รัน Backend
cd /Users/umapornpoodproh/Documents/Inturn-Purin/protrain
npm run start:dev
```

#### 2. ตรวจสอบ Proxy Configuration

ไฟล์ `client/vite.config.ts` ต้องมี proxy สำหรับ routes เหล่านี้:
- `/activities`
- `/deals`
- `/notes`
- `/companies`
- `/cruds`
- `/auth`
- `/admin`

**ถ้ายังไม่มี:**
- ตรวจสอบว่าไฟล์ `vite.config.ts` มี proxy configuration ครบแล้ว
- Restart Vite dev server หลังจากแก้ไข

#### 3. Restart ทั้ง Frontend และ Backend

```bash
# Terminal 1: Backend
cd /Users/umapornpoodproh/Documents/Inturn-Purin/protrain
npm run start:dev

# Terminal 2: Frontend
cd client
npm run dev
```

#### 4. ตรวจสอบ Console ใน Browser

เปิด Developer Tools (F12) และดู Console:
- ถ้าเห็น CORS error → ตรวจสอบว่า backend เปิด CORS แล้ว
- ถ้าเห็น 404 → ตรวจสอบว่า route ถูกต้อง
- ถ้าเห็น connection refused → backend ไม่ได้รัน

---

## 🚀 วิธีรันระบบให้ถูกต้อง

### Step 1: รัน Backend

```bash
cd /Users/umapornpoodproh/Documents/Inturn-Purin/protrain
npm install  # ถ้ายังไม่ได้ install
npm run start:dev
```

**ควรเห็น:**
```
[Nest] Application successfully started on http://localhost:3000
```

### Step 2: รัน Frontend

```bash
# เปิด Terminal ใหม่
cd /Users/umapornpoodproh/Documents/Inturn-Purin/protrain/client
npm install  # ถ้ายังไม่ได้ install
npm run dev
```

**ควรเห็น:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Step 3: เปิด Browser

ไปที่: `http://localhost:5173`

---

## 🔍 ตรวจสอบว่า API ทำงาน

### วิธีทดสอบ API ด้วย curl:

```bash
# ทดสอบ Companies API
curl http://localhost:3000/companies \
  -H "Authorization: Bearer YOUR_TOKEN"

# ทดสอบ Activities API
curl http://localhost:3000/activities \
  -H "Authorization: Bearer YOUR_TOKEN"

# ทดสอบ Deals API
curl http://localhost:3000/deals \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### วิธีทดสอบผ่าน Browser:

1. Login เข้าระบบ
2. เปิด Developer Tools (F12)
3. ไปที่ tab "Network"
4. Refresh หน้า
5. ดู request ที่ส่งไป `/activities`, `/deals`
6. ตรวจสอบ Response:
   - **Status 200** + **Content-Type: application/json** = ✅ ถูกต้อง
   - **Status 404** = Route ไม่มี
   - **Status 500** = Server error
   - **Content-Type: text/html** = ❌ ส่ง HTML แทน JSON

---

## 📝 Checklist เมื่อเกิด Error

- [ ] Backend รันอยู่ที่ port 3000 หรือไม่?
- [ ] Frontend รันอยู่ที่ port 5173 หรือไม่?
- [ ] Proxy configuration ใน `vite.config.ts` ครบหรือไม่?
- [ ] Routes ใน `main.ts` ถูกต้องหรือไม่?
- [ ] CORS เปิดใน backend หรือไม่?
- [ ] Token ยัง valid หรือไม่? (ลอง logout แล้ว login ใหม่)
- [ ] Firebase configuration ถูกต้องหรือไม่?

---

## 🆘 ปัญหาอื่นๆ

### ปัญหา: "Cannot find module"

```bash
# ลบ node_modules และ install ใหม่
rm -rf node_modules package-lock.json
npm install
```

### ปัญหา: Port 3000 ถูกใช้แล้ว

```bash
# หา process ที่ใช้ port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
```

### ปัญหา: Firebase connection error

- ตรวจสอบไฟล์ `.env` หรือ environment variables
- ตรวจสอบ Firebase credentials
- ตรวจสอบว่า Firebase project ถูกต้อง

---

## 💡 Tips

1. **ตรวจสอบ Logs:**
   - Backend logs จะแสดงใน Terminal ที่รัน `npm run start:dev`
   - Frontend errors จะแสดงใน Browser Console

2. **ใช้ Network Tab:**
   - เปิด Developer Tools → Network tab
   - ดู request/response เพื่อ debug

3. **Clear Cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) หรือ `Ctrl+Shift+R` (Windows)
   - Clear browser cache

4. **Restart Everything:**
   - หยุด backend และ frontend
   - Start ใหม่ทั้งคู่

---

**อัพเดทล่าสุด:** 2025-12-02

