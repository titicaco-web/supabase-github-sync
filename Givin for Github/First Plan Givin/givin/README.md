# Givin

> Thoughtful gifting, in your network. Send a real digital gift to a professional
> contact in under 30 seconds — the recipient picks what they want and where to redeem it.

This is the starter monorepo for Givin. It is intentionally **boring and cheap**: every
piece has a generous free tier and is a skill most teams already have.

```
givin/
├─ apps/
│  ├─ web/         React + Vite app  → givin.app
│  └─ extension/   Chrome MV3 "Send a gift" launcher
├─ supabase/
│  ├─ migrations/  schema + Row-Level Security
│  └─ functions/   send-gift · redeem · webhooks (Deno edge functions)
├─ .env.example    documented — NO real secrets ever
└─ README.md
```

## Architecture (one breath)

```
Extension ──click──▶ web app (React) ──▶ Supabase (Auth · Postgres · Edge Functions)
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                     ▼
                    Tremendous            Resend                 Stripe
                  (gift fulfillment)   (email + link)        (paid only)
```

- **LinkedIn is login only.** Sign in with LinkedIn (OpenID Connect) returns name, email,
  photo. That is the only LinkedIn API you can rely on self-serve — no contacts, no messaging.
- **Gifts are delivered by email + a redeem link**, not "inside LinkedIn". The recipient
  needs no account to receive; they only sign up if they want to gift back (the viral loop).
- **The extension is a thin launcher.** It reads only the visible name/headline on an
  explicit click and opens the web app pre-filled. It never scrapes connections or
  auto-messages — that keeps your users' LinkedIn accounts safe and you compliant.

## Quick start

### 1. Supabase
```bash
npm i -g supabase
supabase init            # if not already
supabase start           # local stack (Docker), or use a hosted project
supabase db reset        # applies migrations/ + seeds the gift catalog
```
Set up **Sign in with LinkedIn (OIDC)**: Supabase Dashboard → Authentication → Providers →
LinkedIn (OIDC) → paste your LinkedIn app's Client ID/Secret and redirect URL.

### 2. Web app
```bash
cd apps/web
cp ../../.env.example .env.local   # fill VITE_SUPABASE_* values
npm install
npm run dev                        # http://localhost:5173
```

### 3. Edge functions
```bash
supabase functions deploy send-gift
supabase functions deploy redeem
# set secrets (never commit these):
supabase secrets set TREMENDOUS_API_KEY=... RESEND_API_KEY=... WEB_URL=https://givin.app
```

### 4. Extension
Open `chrome://extensions` → enable Developer mode → **Load unpacked** → select
`apps/extension/`. Set `WEB_URL` at the top of `content.js` to your deployed app.

## Secrets

Secrets live in environment variables and the Supabase/Vercel secret stores — **never** in
this repo, in screenshots, or in documents. `.env.example` documents every variable with no
real values. Rotate any key that ever touches a shared file.

## Status

Phase 0 scaffold — proves the magic moment (login → pick gift → send → recipient redeems).
See the build plan document for the full roadmap (the loop, the extension, teams/CRM).

Private repo. Decide the patent question before any public disclosure.
