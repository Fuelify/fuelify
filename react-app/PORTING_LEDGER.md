# Flutter → React (web) porting ledger

Scope: `apps/web` (the deployed Next.js app) plus the shared package and Supabase.
Status: ☐ todo · ◐ in progress · ☑ done

The Flutter app (`lib/`) is the source of truth for onboarding and the plan view.
Its Home / Discover / Food / Profile tabs were placeholders in Flutter too, so
those are built out here around the data the app already stores.

## A. Foundation

| # | Item | Status |
|---|------|--------|
| A1 | **Households RLS bug:** `insert … returning` fails because the SELECT policy needs membership and the owner is only added by an AFTER trigger. New users can't create a household, so pantry and cart are dead. Fix: the repo inserts without RETURNING and then reads the row back (works today); migration 00004 also corrects the policy. | ☑ |
| A2 | Auto-create a default household on first use so pantry and cart work immediately, with no detour to another tab | ☑ |
| A3 | Design system: color, spacing and radius tokens; shared classes (card, button, input, chip, list, segmented control, sheet/modal); inline SVG icon set | ☑ |
| A4 | App shell: full-viewport layout (`100dvh`), bottom nav fixed and always visible (no scrolling to reach it), content scrolls above it, safe-area insets, active-tab state from the URL | ☑ |
| A5 | Restyle splash, login and registration | ☑ |
| A6 | Routing: new (not onboarded) users go to onboarding, onboarded users go to Plan; `/food` folds into Discover → Saved | ☑ |
| A7 | Eating-habits answers stored in `profiles.goals.habits` (no schema change). 16 starter recipes from migration 00004 applied to Supabase | ☑ |

## B. Onboarding (parity with `lib/screens/onboarding/*`)

| # | Step | Flutter source | Status |
|---|------|----------------|--------|
| B1 | Shell: progress bar, back button, sticky full-width Continue button, step derived from the URL, answers saved to the profile on each step | `onboarding/screen.dart`, `widgets/buttons.dart` | ☑ |
| B2 | Welcome (animated gif + intro text, "Let's Do It!") | `welcome/screen.dart` | ☑ |
| B3 | Profile: first name, last name, location (+ note) | `profile/screen.dart`, `widgets/onboarding/profile.dart` | ☑ |
| B4 | Personal details: preferred units (Metric/Imperial), height, birth date, gender (+ self-describe) | `personal/screen.dart`, `widgets/onboarding/personal.dart` | ☑ |
| B5 | Diet: image cards (Omnivore, Pescatarian, Vegetarian, Vegan, Raw, Other) | `diet/screen.dart` | ☑ |
| B6 | Allergens: multi-select (Dairy, Gluten, Peanuts, Tree Nuts, Soy, Sesame, Eggs, Crustaceans, Fish, Other) | `allergens/screen.dart` | ☑ |
| B7 | Eating habits: calorie-sensitive? choosy eater? | `habits/screen.dart` | ☑ |
| B8 | Health goals: multi-select (6 options) | `goals/screen.dart` | ☑ |
| B9 | Primary goal: single-select | `primary/screen.dart` | ☑ |
| B10 | Weight goals: current weight, goal weight, weekly goal (7 options) | `weight/screen.dart` | ☑ |
| B11 | Shopping: price-sensitive tendency, price impact, weekly budget slider | `shopping/screen.dart` | ☑ |
| B12 | Activity level: image cards (4 levels with descriptions) | `activity/screen.dart` | ☑ |
| B13 | Device connections: Garmin / Fitbit / Apple cards (connect = coming soon) + note | `devices/screen.dart` | ☑ |
| B14 | Submission: save everything, mark onboarded, congratulations, go to the dashboard | `submission/submission.dart` | ☑ |

## C. Dashboard

| # | Item | Status |
|---|------|--------|
| C1 | Plan: week strip (MON–SUN, selected day highlighted), prev/next/today week navigation, meals for the day grouped by meal type, add / edit / delete / move meals (parity: `main/plan/screen.dart`, plus the CRUD the store already supports) | ☑ |
| C2 | Home: greeting, today's meals, pantry items expiring soon, cart count, quick actions | ☑ |
| C3 | Discover: swipeable recipe cards (drag right = like, left = dislike, up = favorite) plus buttons; records classifications (parity: `discovery_screen.dart`) | ☑ |
| C4 | Saved (was the Food tab): liked/favorited recipes, recipe detail sheet, "add to plan" | ☑ |
| C5 | Profile: avatar/initials, editable details, units, view or redo onboarding answers, sign out / create account | ☑ |
| C6 | Cart: restyle on the design system, auto household, member list | ☑ |
| C7 | Pantry: restyle on the design system (incl. scanner, receipt and meal-idea modals), auto household | ☑ |

## D. Verification

| # | Item | Status |
|---|------|--------|
| D1 | `turbo run typecheck` + `next build` pass | ☑ |
| D2 | Mobile-viewport (390×844) Playwright run against a stubbed Supabase: every tab, onboarding steps, sheets, swipe, add-meal, onboarding save and splash routing. Tab bar sits flush at the viewport bottom with 0px page scroll on every tab; no console errors | ☑ |
| D3 | Deploy to Vercel; check the production build | ◐ |

## E. Architecture & data

| # | Item | Status |
|---|------|--------|
| E1 | Shared core: dates, units, food visuals, recipe ranking, meal types, onboarding options and typed profile-JSON readers moved from the web app into `@fuelify/shared` | ☑ |
| E2 | One composition root (`createUserStores`) used by both web (`lib/stores.tsx`) and mobile (`hooks/useStores.ts`) | ☑ |
| E3 | Web layout: `app/` routes only, `features/<domain>/`, `components/ui/` primitives, `@/` imports | ☑ |
| E4 | Unit tests (Vitest) for the shared utilities and models; `npm test` via Turbo | ☑ |
| E5 | `ARCHITECTURE.md` documents layers, rules and commands | ☑ |
| E6 | Login re-enabled (`NEXT_PUBLIC_AUTH_DISABLED=false`); two accounts seeded and sharing "Minier Household" (Ethan owner, Teagan member) | ☑ |

## Out of scope for this pass

- `apps/mobile` (Expo): still uses the old stub screens; port after web is settled.
- Real device integrations (Garmin/Fitbit/Apple OAuth): Flutter never implemented these either.
