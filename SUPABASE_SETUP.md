# Shared leaderboard (Supabase) — 5-minute setup

The arcade works fine without this (the leaderboard falls back to local bots).
Follow these steps to turn it into a **real, live, shared leaderboard** where
multiple people compete against each other. Free tier, no cost.

## 1. Create a free project
1. Go to **supabase.com** → sign in → **New project**.
2. Pick any name/region, set a database password (you won't need it here), create.

## 2. Create the table + security policies
Open **SQL Editor** in the Supabase dashboard, paste this, and **Run**:

```sql
create table if not exists public.scores (
  address    text primary key,
  name       text not null,
  score      bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.scores enable row level security;

-- Anyone can read the board.
create policy "read scores"   on public.scores for select using (true);
-- Anyone can submit/update a score (demo). See the security note below.
create policy "insert scores" on public.scores for insert with check (true);
create policy "update scores" on public.scores for update using (true) with check (true);
```

## 3. Grab your two PUBLIC keys
In the dashboard: **Project Settings → API**. Copy:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public** key → `VITE_SUPABASE_ANON_KEY`

Both are public client values (safe to ship in the browser bundle). **Do NOT**
use the `service_role` key anywhere in this app.

## 4. Add them to the app
- **Local dev:** create a `.env` file (already gitignored) from `.env.example` and fill in the two values.
- **Production (Vercel):** Project → **Settings → Environment Variables**, add both
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then **redeploy** (Vite only
  bundles `VITE_`-prefixed vars, and only at build time).

Once set, the leaderboard shows a **🌐 Live global board** note and real players
appear/update every few seconds.

## Security note (worth knowing for the demo)
The policies above let any visitor write a score — fine for a public demo, and a
determined user could POST a fake number. Players are shown only by **truncated
wallet address**, never email (no PII). For real stakes you'd validate scores on
a trusted backend before recording them — which is exactly the Fireblocks story:
the client handles onboarding and play; a secured backend/treasury is the source
of truth for anything that touches money.
