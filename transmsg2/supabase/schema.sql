-- ============================================================
-- TransMsg Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Sending accounts (WhatsApp, Telegram, SMS)
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null check (platform in ('whatsapp','telegram','sms')),
  identifier text not null,          -- phone number or bot username
  access_token text,
  phone_number_id text,              -- WhatsApp only
  bot_token text,                    -- Telegram only
  twilio_sid text,                   -- Twilio only
  twilio_token text,
  from_number text,
  daily_limit integer default 1000,
  sent_today integer default 0,
  is_active boolean default true,
  is_test_mode boolean default true,
  quality_score text default 'High',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Recipient lists (uploaded batches of numbers)
create table if not exists recipient_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_count integer default 0,
  valid_count integer default 0,
  invalid_count integer default 0,
  duplicate_count integer default 0,
  status text default 'processing' check (status in ('processing','ready','error')),
  created_at timestamptz default now()
);

-- Individual recipients
create table if not exists recipients (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references recipient_lists(id) on delete cascade,
  phone_number text not null,
  name text,
  language text default 'en',
  is_valid boolean default true,
  is_opted_out boolean default false,
  opted_out_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_recipients_list_id on recipients(list_id);
create index if not exists idx_recipients_phone on recipients(phone_number);

-- Campaigns
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message_body text not null,
  template_name text,
  languages text[] default array['en'],
  recipient_list_id uuid references recipient_lists(id),
  status text default 'draft' check (status in ('draft','scheduled','running','paused','completed','failed')),
  rate_per_minute integer default 1000,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  optin_only boolean default true,
  test_mode boolean default true,
  total_recipients integer default 0,
  total_sent integer default 0,
  total_delivered integer default 0,
  total_failed integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Campaign account assignments (auto-split)
create table if not exists campaign_assignments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  account_id uuid references accounts(id),
  assigned_from integer not null,    -- start index in recipient list
  assigned_to integer not null,      -- end index in recipient list
  recipient_count integer default 0,
  status text default 'pending' check (status in ('pending','running','paused','completed','failed')),
  sent_count integer default 0,
  delivered_count integer default 0,
  failed_count integer default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Delivery logs (per message)
create table if not exists delivery_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id),
  assignment_id uuid references campaign_assignments(id),
  account_id uuid references accounts(id),
  recipient_phone text not null,
  message_body text,
  language text default 'en',
  status text default 'pending' check (status in ('pending','sent','delivered','read','failed','opted_out')),
  error_message text,
  platform_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_delivery_logs_campaign on delivery_logs(campaign_id);
create index if not exists idx_delivery_logs_status on delivery_logs(status);

-- Message templates
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  category text default 'marketing',
  languages jsonb default '{}',      -- {en: "...", es: "...", zh: "..."}
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Opt-out registry
create table if not exists opt_outs (
  id uuid primary key default gen_random_uuid(),
  phone_number text unique not null,
  platform text,
  opted_out_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table accounts enable row level security;
alter table recipient_lists enable row level security;
alter table recipients enable row level security;
alter table campaigns enable row level security;
alter table campaign_assignments enable row level security;
alter table delivery_logs enable row level security;
alter table templates enable row level security;
alter table opt_outs enable row level security;

-- Allow all operations for authenticated users (adjust as needed)
create policy "allow_all_accounts" on accounts for all using (true);
create policy "allow_all_lists" on recipient_lists for all using (true);
create policy "allow_all_recipients" on recipients for all using (true);
create policy "allow_all_campaigns" on campaigns for all using (true);
create policy "allow_all_assignments" on campaign_assignments for all using (true);
create policy "allow_all_logs" on delivery_logs for all using (true);
create policy "allow_all_templates" on templates for all using (true);
create policy "allow_all_optouts" on opt_outs for all using (true);

-- ============================================================
-- Seed default templates
-- ============================================================
insert into templates (name, body, category, languages) values
(
  'Promotional Offer',
  'Hi {{name}}! You have an exclusive offer — get 25% off this weekend only. Shop now: {{link}}. Reply STOP to unsubscribe.',
  'marketing',
  '{"en": "Hi {{name}}! You have an exclusive offer — get 25% off this weekend only. Shop now: {{link}}. Reply STOP to unsubscribe.", "es": "¡Hola {{name}}! Tienes una oferta exclusiva — obtén 25% de descuento solo este fin de semana. Compra ahora: {{link}}. Responde STOP para cancelar.", "zh": "您好 {{name}}！您有专属优惠 — 本周末享受75折。立即购物：{{link}}。回复STOP取消订阅。"}'
),
(
  'Welcome Message',
  'Welcome to {{brand}}, {{name}}! We''re glad you''re here. Get started: {{link}}. Reply STOP to unsubscribe.',
  'utility',
  '{"en": "Welcome to {{brand}}, {{name}}! We''re glad you''re here. Get started: {{link}}. Reply STOP to unsubscribe.", "es": "¡Bienvenido a {{brand}}, {{name}}! Nos alegra que estés aquí. Comienza: {{link}}. Responde STOP para cancelar."}'
),
(
  'Appointment Reminder',
  'Hi {{name}}, reminder: your appointment is on {{date}} at {{time}}. Reply 1 to confirm or call {{phone}} to reschedule. Reply STOP to unsubscribe.',
  'utility',
  '{}'
);
