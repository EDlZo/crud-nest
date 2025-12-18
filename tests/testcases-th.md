# ตาราง Test Case (แยกตามหน้า — ภาษาไทย)

เอกสารฉบับนี้จัดระเบียบชุดทดสอบเป็นกลุ่มตามหน้า (per-page) เพื่อให้ง่ายต่อการทดสอบแบบ manual และแปลงเป็น automated tests ในภายหลัง

คำแนะนำการใช้งาน: ทุก test case มีฟิลด์ `รหัส`, `ชื่อทดสอบ`, `จุดประสงค์`, `ขั้นตอน`, `ผลลัพธ์ที่คาดหวัง`, `เงื่อนไขเริ่มต้น`, และ `ความสำคัญ` (สูง/กลาง/ต่ำ)

---

## หน้า Login

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-LOGIN-01 | ล็อกอินสำเร็จ | ตรวจว่า user สามารถล็อกอินได้ | 1. ไปที่หน้า Login 2. กรอกอีเมลและรหัสผ่านถูกต้อง 3. กด Login | ถูกนำไปหน้า Dashboard; token เก็บใน `localStorage` | User มีใน DB | สูง |
| TC-LOGIN-02 | ล้มเหลวเมื่อรหัสผ่านผิด | ตรวจการแจ้งข้อผิดพลาด | 1. กรอกอีเมลถูกต้อง แต่รหัสผ่านผิด 2. กด Login | แสดงข้อความ "อีเมลหรือรหัสผ่านไม่ถูกต้อง"; ไม่เก็บ token | - | สูง |

---

## หน้า Dashboard

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-DASH-01 | แสดงรายการ Due Today | ตรวจ logic คัดกรองรายการที่ต้องดำเนินการวันนี้ | 1. เตรียม records (billingDate/notificationDate/lastNotifiedDate) 2. เปิด Dashboard | แสดงรายการที่ตรงเงื่อนไข (timezone Asia/Bangkok) | DB มี records ที่ตรงเงื่อนไข | สูง |
| TC-DASH-02 | แสดง Date of this contract เป็น dd/mm/yyyy | ตรวจรูปแบบวันที่ | 1. เปิด Dashboard 2. ดู column วันที่สัญญา | แสดงเป็น `DD/MM/YYYY` หรือช่วง `DD/MM/YYYY - DD/MM/YYYY` | Records มี contract dates | กลาง |

---

## หน้า Bill (รายการใบแจ้งหนี้)

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-BILL-01 | แสดง contract date ในรูปแบบ dd/mm/yyyy | ตรวจการแสดงวันที่ | 1. เปิดหน้า Bill 2. ตรวจ column `Date of this contract` | วันที่แสดงเป็น `DD/MM/YYYY` หรือช่วง | มี billing records | สูง |
| TC-BILL-02 | แสดง Notification date เป็น dd/mm/yyyy | ตรวจการแสดง notification date | 1. หาแถวที่มี `notificationDate` หรือ `billingDate` 2. ตรวจการแสดง | แสดงเป็น `DD/MM/YYYY` หรือ `-` | มีค่า notification/billingDate | สูง |
| TC-BILL-03 | กดปุ่มส่ง (paper-plane) ส่งแบบ Manual | ยืนยันการเรียก API และการอัปเดต metadata | 1. กดปุ่มส่งในแถว 2. ยืนยัน confirm 3. ตรวจ DB | API ตอบ 200; `lastNotifiedDate` ถูกตั้งเป็นวันนี้; `notificationsSentCount` เพิ่ม | ผู้ใช้ล็อกอิน | สูง |
| TC-BILL-04 | สร้างใบแจ้งหนี้ใหม่ | ตรวจฟังก์ชันสร้าง | 1. กด Create Invoice 2. กรอกข้อมูลสำคัญ 3. บันทึก | สร้าง record ใน DB และแสดงในตาราง | API ทำงาน | สูง |
| TC-BILL-05 | ลบใบแจ้งหนี้ | ตรวจการลบ | 1. กดปุ่มถังขยะในแถว 2. ยืนยัน | แถวถูกลบจาก UI และ DB | user มีสิทธิ์ | กลาง |
| TC-BILL-06 | ฟิลเตอร์ (company/amount/status) | ตรวจการกรองแถวตามค่า | 1. เปิด filter 2. ใส่เงื่อนไข 3. Apply | ตารางกรองเฉพาะแถวที่ตรง | มีหลาย records | กลาง |

---

## หน้า Billing Preview (ดูรายละเอียดก่อนส่ง)

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-BPREV-01 | แสดงข้อมูล invoice ครบถ้วน | ตรวจ preview | 1. เปิด preview ของ invoice 2. ดูรายละเอียด (company, amount, dates) | ข้อมูลครบตรงกับ DB | record มีข้อมูล | สูง |
| TC-BPREV-02 | กด Send จาก preview | ตรวจการส่งจาก preview | 1. กด Send 2. ยืนยัน | ส่งอีเมลจริง (หรือ simulate); อัปเดต metadata | API ใช้งานได้ | สูง |

---

## หน้า Company (รายชื่อบริษัท / ข้อมูลบริษัท)

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-COMP-01 | สร้างบริษัทใหม่ | ตรวจการสร้าง company | 1. เปิด Create Company 2. กรอกชื่อ/ที่อยู่ 3. บันทึก | Company ถูกสร้างใน DB และแสดงในรายชื่อ | API ทำงาน | สูง |
| TC-COMP-02 | เลือก Province/Amphoe/Tambon และบันทึก | ตรวจ cascade select และบันทึกข้อมูลแยกส่วน | 1. ในฟอร์มเลือก Province -> Amphoe -> Tambon 2. บันทึก 3. โหลดหน้าใหม่ | ค่า province/amphoe/tambon ถูกเก็บและแสดง | Lookup data มี | สูง |
| TC-COMP-03 | แสดง address รวม | ตรวจการแสดง address ที่รวมจาก fields | 1. เปิด Company detail 2. ดู address | แสดง address แบบรวม (text + province/amphoe/tambon) | ข้อมูลถูกบันทึก | กลาง |

---

## หน้า Contact (รายชื่อผู้ติดต่อ)

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-CON-01 | สร้างผู้ติดต่อใหม่ | ตรวจการสร้าง contact | 1. เปิด Add Contact 2. กรอกข้อมูล 3. บันทึก | Contact ถูกสร้างและเชื่อม company | API ทำงาน | สูง |
| TC-CON-02 | Avatar upload ใน modal | ตรวจ overlay และ preview | 1. เปิดฟอร์ม Add/Edit Contact 2. คลิก overlay pen 3. เลือกรูป | preview แสดงและรูปถูกอัปโหลดหลังบันทึก | Upload API มี | กลาง |

---

## หน้า Profile

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-PROFILE-01 | แสดงตัวอักษรเริ่มต้นเมื่อไม่มี avatar | ตรวจ fallback avatar | 1. เข้าหน้า Profile เมื่อไม่มีรูป 2. ดู avatar | แสดงตัวอักษรแรกที่ centered | ไม่มีรูปใน profile | กลาง |
| TC-PROFILE-02 | อัปโหลด avatar และบันทึก | ตรวจ upload flow | 1. คลิก overlay 2. เลือกรูป 3. บันทึก | รูปถูกบันทึกใน DB/Storage และแสดงใน UI | Upload API ทำงาน | สูง |

---

## หน้า Deals

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-DEAL-01 | สร้าง deal และเชื่อมบริษัท | ตรวจความสัมพันธ์ | 1. สร้าง deal ใหม่ โดยเลือก company 2. บันทึก | Deal แสดงบน company details | DB พร้อม | กลาง |

---

## หน้า Activities / Recent

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-ACT-01 | Recent activities แสดงข้อมูลและวันที่ | ตรวจการแสดง activity | 1. เปิด Activities 2. ดูรายการ | แสดงรายการกิจกรรมล่าสุด พร้อมวันที่ `dd/mm/yyyy` | Activity มีใน DB | ต่ำ |

---

## หน้า Notifications (การแจ้งเตือน)

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-NOTIF-01 | แสดงรายการ Notifications | ตรวจการดึงและแสดงรายการแจ้งเตือนในหน้า Notifications | 1. เข้าหน้า Notifications 2. ตรวจรายการแจ้งเตือน (unread/อ่านแล้ว) | รายการแจ้งเตือนถูกดึงจาก API และแสดงเรียงตามวันที่; แสดงสถานะ unread/read | มี notification records ใน DB | สูง |
| TC-NOTIF-02 | มาร์คอ่าน / มาร์คยังไม่อ่าน | ตรวจ action mark read/unread | 1. บนรายการแจ้งเตือนกดปุ่ม "Mark as read" 2. ตรวจ UI และ API | รายการเปลี่ยนสถานะเป็นอ่านใน UI และ `readAt` ถูกบันทึกใน DB; สามารถ mark unread กลับได้ | user มีสิทธิ์ | สูง |
| TC-NOTIF-03 | กรอง/ค้นหา Notifications | ตรวจการกรองและการค้นหา | 1. ใช้ช่องค้นหา (ข้อความ/ประเภท) 2. กด Apply | ตารางกรองแสดงเฉพาะรายการที่ตรงเงื่อนไข | มีหลายประเภทแจ้งเตือน | กลาง |
| TC-NOTIF-04 | รีเซนด์ (Resend) การแจ้งเตือนแบบ Manual | ตรวจปุ่มส่งซ้ำ (ถ้ามี) | 1. เลือกรายการที่เป็นการแจ้งเตือนอีเมล 2. กดปุ่ม Resend 3. ตรวจการตอบ API และ metadata | API ตอบ 200; หากเป็น email `sentAt`/`status` ถูกอัปเดต; UI แสดงผลสำเร็จ | notification type = email | กลาง |
| TC-NOTIF-05 | ตั้งค่าการแจ้งเตือน (Notification Settings) | ตรวจการเปิด/ปิดการแจ้งเตือนและบันทึกการตั้งค่า | 1. ไปที่หน้า Settings -> Notifications 2. เปลี่ยน setting (เช่น เปิด/ปิด email) 3. บันทึก | การตั้งค่าเก็บใน DB และนำไปใช้ (เช่น scheduler จะข้ามผู้ที่ปิด email) | user มีสิทธิ์เข้าถึง settings | สูง |
| TC-NOTIF-06 | Pagination / Lazy-load | ตรวจการแบ่งหน้าเมื่อมีจำนวนมาก | 1. สร้าง 200+ notification 2. เปิดหน้า Notifications 3. เลื่อนหรือกดหน้า | ระบบแบ่งหน้า/โหลดเพิ่มและ UI ไม่ค้าง | DB มี many notifications | กลาง |
| TC-NOTIF-07 | Webhook / External event creates Notification | ตรวจ integration ที่สร้าง notification | 1. ส่ง event ไปยัง endpoint ที่รับ webhook 2. ตรวจ Notifications page | ระบบสร้าง notification ใหม่และแสดงในหน้า | webhook endpoint ถูกเปิด | กลาง |
| TC-NOTIF-08 | Security: ป้องกันการเข้าถึง notifications ของผู้อื่น | ตรวจสิทธิ์ระหว่างผู้ใช้ | 1. เข้าด้วย user A 2. พยายามเข้าถึง notification ของ user B ผ่าน API/URL | API คืน 403 หรือ รายการไม่ปรากฏ | มี user หลายบัญชี | สูง |


---

## หน้า Admin / Settings

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-ADMIN-01 | Trigger scheduler ผ่าน UI (admin) | ตรวจ API trigger-scheduler | 1. เข้าด้วย admin 2. กด Trigger Scheduler (dry-run/doRun) 3. ดูผล | Dry-run คืน candidates; doRun ส่งจริงและอัปเดต metadata | admin token | กลาง |

---

## Scheduler / Backend APIs

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-SCHED-01 | Scheduler ส่งอีเมลเมื่อถึงเวลา | ตรวจ cron logic และการอัปเดต metadata | 1. เตรียม record billingDate = วันนี้ 2. รัน scheduler (doRun) | ส่งอีเมล; `lastNotifiedDate` และ `notificationsSentCount` อัปเดต; ถ้า recurring `billingDate` เลื่อน | Scheduler ทำงาน | สูง |
| TC-SCHED-02 | Scheduler ข้ามรายการที่แจ้งแล้ววันนี้ | ป้องกัน duplicate send | 1. ตั้ง `lastNotifiedDate` เป็นวันนี้ 2. รัน scheduler | ข้ามรายการนั้น | lastNotifiedDate ตั้งไว้แล้ว | สูง |
| TC-API-01 | POST /billing-records/:id/send (API) | ตรวจการทำงานของ endpoint ส่งอีเมล (manual) | 1. เรียก API ด้วย token 2. ตรวจการตอบและ DB | ตอบ 200; metadata ถูกอัปเดต | token มีสิทธิ์ | สูง |

---

## Utilities / Date Formatter

| รหัส | ชื่อทดสอบ | จุดประสงค์ | ขั้นตอน | ผลลัพธ์ที่คาดหวัง | เงื่อนไขเริ่มต้น | ความสำคัญ |
|---|---|---|---|---|---:|---|
| TC-DATE-UTIL-01 | formatToDDMMYYYY รองรับรูปแบบต่าง ๆ | ตรวจ util แปลงวันที่ | 1. เรียกด้วย `2025-12-08` / `2025-12-08T12:00:00Z` / `new Date()` / firestore timestamp | คืน `dd/mm/yyyy` หรือ fallback เป็น String | util อยู่ใน `client/src/utils` | กลาง |

---

## Error cases / Security / Performance (รวม)

- ตรวจ validation errors, 4xx/5xx responses
- ตรวจ XSS บนฟิลด์ text (address, notes)
- ทดสอบ load สำหรับหน้า Bill/ Dashboard เมื่อมีจำนวนมาก (10k)

---

หากต้องการปรับรูปแบบ output เป็น CSV/Excel หรือสร้าง automated tests จากรายการนี้ (Jest / Playwright), บอกผมได้ — ผมจะเริ่ม scaffold ให้ทันที

