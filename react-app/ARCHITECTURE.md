# Fuelify (React) — architecture

A Turborepo monorepo with one shared library and two thin apps.

```
react-app/
├─ packages/shared/        @fuelify/shared — platform-agnostic core (no React, no DOM)
│  └─ src/
│     ├─ models/           domain types + constants (meal types, onboarding options,
│     │                    typed readers for profile JSON columns)
│     ├─ supabase/         repositories: the only code that talks to tables
│     ├─ services/         external integrations (receipt OCR, AI meal ideas, barcodes)
│     ├─ stores/           zustand vanilla stores (state + actions over repositories)
│     │  └─ app-stores.ts  createUserStores(): composition root for per-user state
│     ├─ utils/            pure functions (dates, units, recipe ranking, food visuals)
│     └─ constants/
├─ apps/web/               Next.js (deployed on Vercel)
│  ├─ app/                 routes only — pages compose features, no business logic
│  ├─ features/<domain>/   feature modules (auth, onboarding, meals, recipes, pantry)
│  ├─ components/ui/       design-system primitives (Sheet, Icon, controls, …)
│  └─ lib/stores.tsx       React bindings: providers + typed selector hooks
├─ apps/mobile/            Expo; same shared core, bound in hooks/useStores.ts
└─ supabase/
   ├─ migrations/          schema (append-only)
   ├─ seed/                catalog data: recipes.json → recipes.sql (generated)
   └─ functions/           edge functions
```

## Rules

- **Dependencies point inward.** apps → `@fuelify/shared`; inside shared:
  stores → repositories/services → Supabase client. Shared never imports React or the DOM.
- **Logic belongs in shared.** If both apps could need it (a calculation, a list of
  options, a ranking rule) it lives in `packages/shared` with a unit test, and the
  apps only render it. Example: the Discover deck order is `buildDiscoverDeck()`.
- **One composition root.** Repositories and stores are constructed only in
  `createUserStores()`; each app wraps that in its own hooks (`lib/stores.tsx`,
  `hooks/useStores.ts`).
- **Typed JSON.** `profiles.goals` / `profiles.shopping` / `profiles.meal_plan_config` are
  read through `readGoals()` / `readShopping()` / `readMealPlanConfig()`, never cast ad hoc.
- **Local dates.** Use the `utils/dates` helpers; `toISOString()` gives the UTC date.
- **Imports (web):** framework → `@fuelify/shared` → `@/…` (app code) → relative.
- **Styling (web):** design tokens and component classes in `app/globals.css`;
  inline styles only for one-off layout, and never raw colours — use the tokens.
- **Brand:** the logo lives in `assets/brand/fuelify-mark.svg`; its colours and
  geometry are exported from `@fuelify/shared` (`BRAND_COLORS`, `LOGO_*`) and the
  web `LogoMark`/`Logo` components render from them. Theme tokens are derived from
  the brand colours (see `assets/brand/README.md`).
- **Theming:** light tokens on `:root`, dark overrides on `[data-theme='dark']`.
  The preference (System / Light / Dark) lives in the shared preferences store;
  `lib/theme-constants.ts` sets `data-theme` before first paint and
  `lib/theme.tsx` keeps it in sync with the store and the OS.
- **Plans:** the subscription plan is per household (`households.plan`, owner-only).
  The meal plan generator (Premium) is the pure `generateMealPlan()` in
  `services/plan-generator.ts`; `plan-generation-store` loads its inputs, replaces
  only meals marked `generated`, and never touches meals the user added or edited.
- **Recipe import:** `services/recipe-import.ts` parses schema.org JSON-LD or pasted
  text into a `RecipeDraft`. Pages are fetched only by the web API route
  `app/api/recipes/import` (signed-in users; public hosts only, re-checked on every
  redirect; time- and size-limited — see `lib/fetch-recipe-page.ts`). Users read the
  catalog plus their own and their household's recipes (RLS `recipes_read`).
- **Voice input:** speech-to-text uses the browser's built-in recognizer
  (`lib/useSpeechInput.ts`; Chrome, Edge and Safari, not Firefox) and nothing
  is sent to our servers. Turning words into content is pure, tested code in
  `services/voice-parse.ts`: `parseSpokenItems` for lists and pantry,
  `spokenRecipeToText` feeding `parseRecipeText`, and `spokenQuery` for search.
  The UI pieces are in `features/voice`: `VoiceButton` for one phrase,
  `VoiceSheet` for dictation and `VoiceItemsSheet`. They render nothing where
  the browser can't listen.
  After you speak, items are matched to products by `services/item-matcher.ts`
  (`groceryStore.matchItems`). Candidates come from the household's past
  picks (`household_product_choice_stats`), then its pantry, then live store
  results (Premium). The top option fills itself in, and every pick is
  logged so it ranks first next time.
- **Profile pictures:** they're stored in the Supabase Storage bucket `avatars`
  (migration 00016). The bucket is public to read; a user can write only to
  `<their id>/`. The web app center-crops to a 512px JPEG before uploading
  (`lib/image.ts`), and `profiles.image_url` holds the public URL.
- **Location:** `/api/location/search` and `/api/location/reverse` are open to
  signed-in users only. They use Photon (the OpenStreetMap geocoder; no key,
  results cached for a day). Reverse lookups round coordinates to about 100 m,
  and positions are never stored. Picking a US city fills in the grocery ZIP
  if none is set.
- **Behavior events (learning data):** every choice that says something about a
  household's habits is appended to `behavior_events` (migration 00015) through
  the `behaviorLog` built in `createUserStores()`. This covers ingredient swaps
  and undos, meal adds, removals, moves, shuffles and ratings, generated plans,
  list skips, cart builds, product picks (against the recommendation), searches
  and checkouts. Stores call `log.track()`; never write the table directly.
  Rows are append-only (no update or delete policies). They carry typed columns
  (from → to, normalized `ingredientKey`s, aisle categories, suggestion rank,
  store, product and price), a `context` snapshot of the settings at the time,
  and a versioned `payload`. Views `household_ingredient_swap_stats`,
  `household_recipe_stats` and `household_product_choice_stats` aggregate it per
  household. A new decision point in the app should add an event type (in
  `models/behavior-event.ts` and the table's CHECK) rather than going unlogged.

## Commands (from `react-app/`)

| | |
|---|---|
| `npm run typecheck` | type-check every package |
| `npm test` | unit tests (Vitest, shared package) |
| `npm run build:web` | production build of the web app |
| `npm run seed:recipes` | regenerate `supabase/seed/recipes.sql` from `recipes.json` |

## Environment

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`NEXT_PUBLIC_AUTH_DISABLED` (`true` = no login; each visitor gets an anonymous
Supabase session). Mobile uses the `EXPO_PUBLIC_` equivalents.
