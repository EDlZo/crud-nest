# ER Diagram (Entity Relationship Diagram)

> หมายเหตุ: โครงสร้างนี้อิงจากระบบจริง (Firestore/NestJS) และปรับให้อ่านง่ายในรูปแบบ markdown

```mermaid
erDiagram
    COMPANY ||--o{ CONTACT : has
    COMPANY ||--o{ BILLING_RECORD : has
    COMPANY ||--o{ DEAL : has
    CONTACT ||--o{ DEAL : has
    BILLING_RECORD ||--o{ NOTIFICATION : has
    USER ||--o{ BILLING_RECORD : created

    COMPANY {
      string id PK
      string name
      string address
      string province
      string amphoe
      string tambon
      string taxId
      string phone
      string email
      date createdAt
      date updatedAt
    }
    CONTACT {
      string id PK
      string companyId FK
      string name
      string email
      string phone
      string address
      string province
      string amphoe
      string tambon
      date createdAt
    }
    BILLING_RECORD {
      string id PK
      string companyId FK
      string contractStartDate
      string contractEndDate
      string billingDate
      int billingIntervalMonths
      string notificationDate
      int notificationsSentCount
      string lastNotifiedDate
      float amount
      string status
      date createdAt
    }
    NOTIFICATION {
      string id PK
      string billingRecordId FK
      string sentAt
      string status
      string type (auto/manual)
    }
    USER {
      string id PK
      string email
      string passwordHash
      string role (admin/user)
      string avatarUrl
      string name
      date createdAt
    }
    DEAL {
      string id PK
      string companyId FK
      string contactId FK
      string title
      string status
      date createdAt
    }
```

---

*สามารถเปิดดูแผนภาพ Mermaid ได้ใน VS Code หรือแปลงเป็น PNG ได้ภายหลัง*
