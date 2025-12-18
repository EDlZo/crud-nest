# แผนภาพ Workflow (ลำดับขั้นตอนการทำงาน)

## 1. การสร้างใบแจ้งหนี้ (Create Billing)

```mermaid
flowchart TD
    A[เข้าสู่ระบบ] --> B[เลือกเมนู Bill]
    B --> C[กด +Create Invoice]
    C --> D[กรอกข้อมูลใบแจ้งหนี้]
    D --> E[บันทึก]
    E --> F[แสดงในตาราง Bill]
```

## 2. การแจ้งเตือนอัตโนมัติ (Scheduler)

```mermaid
flowchart TD
    S1[Scheduler เริ่มทำงาน (cron)] --> S2[ดึง billing records ที่ถึงกำหนด]
    S2 --> S3[ตรวจสอบ lastNotifiedDate]
    S3 -->|ยังไม่แจ้งวันนี้| S4[ส่งอีเมล]
    S4 --> S5[อัปเดต lastNotifiedDate, notificationsSentCount]
    S3 -->|แจ้งแล้ววันนี้| S6[ข้าม]
```

## 3. การส่งอีเมลแบบ Manual

```mermaid
flowchart TD
    M1[ผู้ใช้กดปุ่มส่งในหน้า Bill] --> M2[ยืนยันการส่ง]
    M2 --> M3[เรียก API /billing-records/:id/send]
    M3 --> M4[ระบบส่งอีเมลและอัปเดต metadata]
```

## 4. การจัดการที่อยู่บริษัท/ผู้ติดต่อ

```mermaid
flowchart TD
    C1[เปิดฟอร์ม Company/Contact] --> C2[กรอกที่อยู่/เลือกจังหวัด-อำเภอ-ตำบล]
    C2 --> C3[บันทึก]
    C3 --> C4[ข้อมูลถูกบันทึกใน DB]
```

---

*หมายเหตุ: สามารถเปิดดูแผนภาพ Mermaid ได้ใน VS Code หรือแปลงเป็น PNG ได้ภายหลัง*