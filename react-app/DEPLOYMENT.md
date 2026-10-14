# Deployment

Fuelify has three deployment targets: a **Supabase** backend (database + edge
functions), a **Next.js web app** (Vercel), and an optional **Expo** native app
(EAS Build + app stores).

---

## Prerequisites

- A [Supabase](https://supabase.com) project (free tier works)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm i -g supabase`)
- A [Vercel](https://vercel.com) account (free tier works)
- Node.js >= 18

---

## 1. Supabase

### 1a. Link your project

```sh
cd react-app
supabase login
supabase link --project-ref <your-project-ref>
```

### 1b. Apply database migrations

If you have SQL migrations in `supabase/migrations/`:

```sh
supabase db push
```

### 1c. Set secrets

```sh
# Receipt OCR (Mindee)
supabase secrets set MINDEE_API_KEY=<your-mindee-token>

# AI meal suggestions (Anthropic)
supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-key>

# Optional — override the model (defaults to claude-sonnet-4-6)
# supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
```

### 1d. Deploy edge functions

```sh
supabase functions deploy parse-receipt
supabase functions deploy suggest-meals
```

### 1e. Note your credentials

From the Supabase dashboard → Settings → API, copy:

- **Project URL** — e.g. `https://abcdef.supabase.co`
- **Anon public key** — starts with `eyJ...`

You'll need these for the web and mobile apps.

---

## 2. Web App (Vercel)

### Option A: Vercel Dashboard (recommended)

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo.
2. Set the **Root Directory** to `react-app/apps/web`.
3. Framework will be auto-detected as **Next.js**.
4. Add environment variables:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

5. Click **Deploy**.

The `vercel.json` in `apps/web/` ensures the monorepo build works correctly
(Turbo builds the shared package first, then the web app).

### Option B: Vercel CLI

```sh
cd react-app/apps/web
npx vercel --prod
```

You'll be prompted for the environment variables on first deploy.

### Custom domain

After deploying, go to your Vercel project → Settings → Domains to add a
custom domain (e.g. `app.fuelify.com`).

---

## 3. Mobile App (optional)

The web app is fully usable on mobile browsers — a native app is only needed
for push notifications, native camera barcode scanning, and an App Store /
Play Store listing.

### Local development

```sh
cd react-app/apps/mobile
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npx expo start
```

Scan the QR code with Expo Go on your phone.

### Production build (EAS)

```sh
npm install -g eas-cli
eas login

# First time: configure EAS
cd react-app/apps/mobile
eas build:configure

# Build for both platforms
eas build --platform all

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

---

## Environment Variables Reference

### Web (`apps/web/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `NEXT_PUBLIC_AUTH_DISABLED` | No | `true` skips login; each visitor gets an anonymous Supabase session (requires Anonymous Sign-Ins enabled in Supabase → Authentication → Providers) |

### Mobile (`apps/mobile/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `EXPO_PUBLIC_AUTH_DISABLED` | No | Same as `NEXT_PUBLIC_AUTH_DISABLED`, for mobile |

### Supabase Edge Functions (set via `supabase secrets set`)

| Secret | Used by | Description |
|--------|---------|-------------|
| `MINDEE_API_KEY` | `parse-receipt` | [Mindee](https://developers.mindee.com) Receipt Parser API token |
| `ANTHROPIC_API_KEY` | `suggest-meals` | [Anthropic](https://console.anthropic.com) API key |
| `ANTHROPIC_MODEL` | `suggest-meals` | Optional model override (default: `claude-sonnet-4-6`) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Clients                         │
│                                                  │
│  ┌──────────┐   ┌───────────┐   ┌────────────┐ │
│  │ Web App  │   │ Mobile    │   │ Mobile     │  │
│  │ (Vercel) │   │ Browser   │   │ Native App │  │
│  │ Next.js  │   │ (same URL)│   │ (Expo/EAS) │  │
│  └────┬─────┘   └─────┬─────┘   └──────┬─────┘ │
└───────┼───────────────┼────────────────┼────────┘
        │               │                │
        └───────────────┼────────────────┘
                        │
              Supabase JS SDK
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐   ┌───────────┐   ┌───────────┐
   │ Supabase│   │   Edge    │   │   Edge    │
   │ Postgres│   │ Function: │   │ Function: │
   │  + Auth │   │  parse-   │   │  suggest- │
   │  + RLS  │   │  receipt  │   │  meals    │
   └─────────┘   │  (Mindee) │   │ (Claude)  │
                 └───────────┘   └───────────┘
```

## Grocery store connections (Premium)

Store APIs are called only from the server routes in `apps/web/app/api/grocery/*`.
Add these in Vercel → Project → Settings → Environment Variables (Production), then
redeploy. A store with no keys shows "Not set up yet" in Household → Grocery stores.

| Store | Sign up | Variables |
| --- | --- | --- |
| Kroger (and Kroger-family stores) | https://developer.kroger.com — create an app with the `product.compact` and `cart.basic:write` scopes, and add the redirect URI `https://fuelifyapp.vercel.app/kroger/callback` | `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET`, optional `KROGER_REDIRECT_URI` (default: `<site>/kroger/callback`) |
| Receipt reading (price book) | https://console.anthropic.com — API key | `ANTHROPIC_API_KEY` |
| Walmart | https://walmart.io — Affiliate (product) API; upload an RSA public key | `WALMART_CONSUMER_ID`, `WALMART_PRIVATE_KEY` (PEM; `\n` escapes are fine), `WALMART_KEY_VERSION` (default `1`), optional `WALMART_PUBLISHER_ID` |
| Instacart (Publix and others) | https://www.instacart.com/company/business/developers — Developer Platform API key | `INSTACART_API_KEY`, optional `INSTACART_API_BASE` (`https://connect.dev.instacart.tools` for development keys) |

What each does today:
- **Kroger** — product search with local prices and promos at the store nearest the
  household's ZIP. Each person can connect their Kroger account once (Household →
  Grocery stores, or the Cart's Kroger section); "Add to my Kroger cart" then puts the
  chosen products in their real Kroger cart. Their Kroger tokens are stored in
  `kroger_links` (migration 00024), encrypted with a key derived from `KROGER_CLIENT_SECRET`,
  so rotating the secret means everyone reconnects.
- **Walmart** — product search with prices; "Open Walmart cart" uses Walmart's add-to-cart link.
- **Instacart** — no price search; sends the list to Instacart, where the user picks the store (e.g. Publix).
- **Any other store (Aldi, Publix, Costco, Target…)** — no keys needed: "Share or shop at another
  store" shares or copies the list, and opens each item in that store's own website search
  (`services/shop-elsewhere.ts`).
