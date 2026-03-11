# Split Expense - หารค่าใช้จ่าย

Web PWA สำหรับหารค่าข้าว ค่าท่องเที่ยว ที่พัก กับเพื่อนๆ

## ฟีเจอร์

- ✨ สร้างหลาย Group ได้
- 👥 แต่ละ Group มีสมาชิกหลายคน
- 📝 สร้างบิลได้หลายบิล พร้อมใส่ส่วนลด
- 🔢 หารได้หลายแบบ: เท่า ๆ กัน, หารเป็น %, หรือกำหนดเอง
- 📊 สรุปยอดให้ดูว่าแต่ละคนต้องจ่ายเท่าไหร่
- 📱 รองรับ PWA (ติดตั้งได้บนมือถือ)
- 💾 ใช้งาน offline ได้

## Tech Stack

- **Frontend**: SvelteKit 5 + TypeScript
- **Styling**: TailwindCSS 4
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide Svelte

## การตั้งค่า

1. สร้างไฟล์ `.env` จาก `.env.example`:
```bash
cp .env.example .env
```

2. ใส่ Supabase credentials ใน `.env`:
```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. สร้างตารางใน Supabase:
```sql
-- 1. สร้างตาราง Groups (กลุ่มท่องเที่ยว/กลุ่มกินข้าว)
CREATE TABLE groups (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. สร้างตาราง Members (สมาชิกในกลุ่ม - ใส่แค่ชื่อ)
CREATE TABLE group_members (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. สร้างตาราง Bills (ใบเสร็จ/กิจกรรม)
CREATE TABLE bills (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  description text NOT NULL,
  total_amount numeric(12, 2) NOT NULL,
  discount_amount numeric(12, 2) DEFAULT 0,
  service_charge_percent numeric(5, 2) DEFAULT 0,
  payer_member_id uuid REFERENCES group_members(id),
  split_type text CHECK (split_type IN ('equal', 'manual', 'percentage')) DEFAULT 'equal',
  created_at timestamptz DEFAULT now()
);

-- 4. สร้างตาราง Bill_Splits (ยอดที่แต่ละคนต้องจ่ายในบิลนั้นๆ)
CREATE TABLE bill_splits (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE,
  member_id uuid REFERENCES group_members(id) ON DELETE CASCADE,
  amount_owed numeric(12, 2) NOT NULL,
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- เพิ่ม Index เพื่อให้เวลาค้นหาข้อมูลเร็วขึ้น
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_bills_group_id ON bills(group_id);
CREATE INDEX idx_bill_splits_bill_id ON bill_splits(bill_id);
```

4. ติดตั้ง dependencies และรัน:
```bash
npm install
npm run dev
```

5. เปิด browser ไปที่ `http://localhost:5173`

## การ Build

```bash
npm run build
```

## โครงสร้างโปรเจค

```
src/
├── lib/
│   ├── components/     # UI Components
│   ├── database.types.ts
│   ├── supabase.ts
│   ├── stores.ts
│   ├── types.ts
│   └── utils.ts
├── routes/
│   ├── +layout.svelte
│   ├── +page.svelte           # หน้าแรก (รายการ Groups)
│   └── groups/
│       └── [id]/
│           ├── +page.svelte   # Group Detail
│           ├── summary/
│           │   └── +page.svelte  # หน้าสรุปยอด
│           └── bills/
│               ├── new/
│               │   └── +page.svelte  # สร้าง Bill ใหม่
│               └── [billId]/
│                   └── +page.svelte  # แก้ไข Bill
├── app.css
└── service-worker.ts   # PWA Service Worker
```

## License

MIT
