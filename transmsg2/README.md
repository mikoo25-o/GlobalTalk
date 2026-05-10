# TransMsg — Real Bulk Messaging System

## Stack
- **Frontend**: React + Vite → Vercel
- **Backend**: Python FastAPI → Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL + File Storage)
- **Queue**: Supabase + background workers

## Quick Start (Local)

### 1. Supabase Setup
1. Go to https://supabase.com → New Project
2. Go to SQL Editor → paste contents of `supabase/schema.sql` → Run
3. Go to Settings → API → copy `URL` and `anon key`

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env   # fill in your keys
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
cp ../.env.example .env   # fill in your keys
npm run dev
```

## Environment Variables
See `.env.example` for all required variables.

## How Bulk Sending Works
1. Upload CSV/Excel or paste phone numbers
2. System validates and deduplicates numbers
3. Numbers auto-split equally across your sending accounts
4. Each account sends its assigned group simultaneously
5. Live progress tracked per account in real time

## Adding API Keys (when ready)
- **WhatsApp Business API**: Get from Meta Business Manager
- **Twilio SMS**: Get from twilio.com/console
- **Telegram**: Get bot token from @BotFather
Add keys in the Settings page — system switches from Test Mode to Live automatically.
