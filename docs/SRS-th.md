# เอกสารความต้องการเชิงระบบ (SRS)

## 1. บทนำ
ระบบนี้เป็นระบบบริหารจัดการลูกค้า ใบแจ้งหนี้ (Billing), การแจ้งเตือนอีเมล, การจัดการบริษัท, ผู้ติดต่อ, และการบันทึกกิจกรรม/ดีล รองรับการทำงานทั้งฝั่งผู้ดูแล (admin) และผู้ใช้งานทั่วไป

## 2. ขอบเขตระบบ
- จัดการข้อมูลบริษัท (Companies)
- จัดการผู้ติดต่อ (Contacts)
- สร้าง/แก้ไข/ลบ ใบแจ้งหนี้ (Billing Records)
- ระบบแจ้งเตือนอีเมลอัตโนมัติ (Scheduler)
- Dashboard สรุปสถานะและรายการที่ต้องดำเนินการวันนี้
- ระบบผู้ใช้และสิทธิ์ (Authentication/Authorization)
- การอัปโหลดรูปโปรไฟล์ (Profile/Avatar)

## 3. ความต้องการเชิงฟังก์ชัน (Functional Requirements)
- ผู้ใช้สามารถเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน
- ผู้ใช้สามารถดู/เพิ่ม/แก้ไข/ลบ บริษัท, ผู้ติดต่อ, ใบแจ้งหนี้
- ระบบสามารถส่งอีเมลแจ้งเตือนอัตโนมัติเมื่อถึงกำหนด (Scheduler)
- ผู้ใช้สามารถกดส่งอีเมลแจ้งเตือนแบบ manual ได้
- ระบบบันทึกวันที่และจำนวนครั้งที่แจ้งเตือนในแต่ละ billing record
- ผู้ใช้สามารถอัปโหลด/เปลี่ยน/ลบรูปโปรไฟล์
- ระบบแสดง Dashboard สรุปรายการ Due Today
- ระบบมีการจัดการสิทธิ์ (admin, user)

## 4. ความต้องการเชิงไม่ฟังก์ชัน (Non-Functional Requirements)
- รองรับผู้ใช้หลายคนพร้อมกัน 
- ความปลอดภัย: JWT, password hash, ตรวจสอบสิทธิ์ทุก endpoint
- รองรับ timezone Asia/Bangkok
- UI รองรับ responsive design
- ระบบต้องมี test case ครอบคลุมฟีเจอร์หลัก

## 5. ข้อจำกัด (Constraints)
- ใช้ Firestore เป็นฐานข้อมูลหลัก
- ใช้ NestJS (backend), React (frontend)
- Email ผ่าน Postmark หรือ SMTP fallback

## 6. แผนภาพ Workflow
ดูไฟล์ [docs/workflow.md](./workflow.md)

## 7. ER Diagram
ดูไฟล์ [docs/er-diagram.md](./er-diagram.md)

## 8. Test Case
ดูไฟล์ [tests/testcases-th.md](../tests/testcases-th.md)

---

*ปรับปรุงล่าสุด: 18 ธันวาคม 2025*