# LinkedIn login setup (your own Supabase)

LinkedIn login is enabled in your **Supabase project** and your **LinkedIn app** — not in
the code builder. Do these five parts once and the "Continue with LinkedIn" button works.
Works the same whether you edit in Bolt, v0, Cursor, or Replit. Takes ~20 minutes.

> LinkedIn OIDC returns only name, email, and photo — that is all this login needs. You do
> NOT need the restricted partner APIs (connections/messaging are not available self-serve).

**Before you start:** be on your own project at supabase.com, **not** Lovable Cloud
(Lovable Cloud hides the dashboard and can't enable LinkedIn — that's why you're switching).

## 1. Create a Supabase project
1. supabase.com → **New project** (EU region if your users are in Europe).
2. **Project Settings → API**, copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
3. **SQL Editor → New query** → paste & run `supabase/migrations/0001_init.sql`,
   then `supabase/migrations/0002_catalog.sql`.

## 2. Create the LinkedIn app
1. linkedin.com/developers/apps → **Create app** (needs a LinkedIn Company Page).
2. **Products** tab → **"Sign In with LinkedIn using OpenID Connect"** → **Request access**
   (self-serve, instant).
3. **Auth** tab → note `Client ID` and `Primary Client Secret`.
4. Confirm scopes: `openid profile email`.

## 3. Connect them (the redirect URL — the part people get stuck on)
1. **Supabase → Authentication → Providers → LinkedIn (OIDC)**: toggle on, paste
   `Client ID` + `Client Secret`, then **copy the Callback URL**:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. **LinkedIn → app → Auth → Authorized redirect URLs**: paste that exact callback URL.
3. **Supabase → Authentication → URL Configuration**: set **Site URL**, and add every app
   address under **Redirect URLs**:
   - `http://localhost:5173` (local dev)
   - your Bolt / v0 / Vercel preview URL
   - `https://givin.app` (production)

**Rule of thumb:** the *callback* URL (in LinkedIn) is always the `...supabase.co/auth/v1/callback`
one. The *redirect* URLs (in Supabase) are *your app's* pages. Mixing them up is the #1 cause
of `redirect_uri mismatch`.

## 4. Point the app at your Supabase
Set two env vars on the web app (in your builder or `apps/web/.env.local`):
```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```
The code already calls the right method — no edits needed
(`apps/web/src/lib/useAuth.js`):
```js
supabase.auth.signInWithOAuth({
  provider: 'linkedin_oidc',
  options: { redirectTo: window.location.origin + '/app' },
})
```

## 5. Test
1. Run the app → **Continue with LinkedIn** → approve → land on `/app` signed in.
2. **Supabase → Authentication → Users**: your account appears. The new-user trigger
   auto-creates a profile, a `user` role, and free credits.

## If something breaks
| Error | Fix |
|---|---|
| `redirect_uri mismatch` | Callback URL in LinkedIn ≠ Supabase's. Re-copy, no trailing slash. |
| `provider is not enabled` | LinkedIn OIDC toggle off, or product not added to the LinkedIn app. |
| Stuck after approving | App URL missing from Supabase → Auth → URL Configuration → Redirect URLs. |
| Email empty | Confirm `email` scope; account needs a verified primary email. |

**Secrets:** the `anon` key is safe in the browser. The service-role key and provider
secrets (Tremendous, Resend, Stripe) live only in Supabase Edge Function secrets or your
host's env store — never in the repo. `.gitignore` already excludes `.env` files.
