# Seed data

`recipes.json` is the source of truth for the Discover catalog (recipes with
`created_by = NULL`). Every recipe needs a title, description, cuisine,
`diet_type` (Omnivore, Pescatarian, Vegetarian, Vegan, Raw or Other), calories,
prep/cook minutes, servings, ingredients and steps.

To add or change recipes:

1. Edit `recipes.json`.
2. Regenerate the SQL from `react-app/`: `npm run seed:recipes`. The generator
   validates every entry and fails on a missing field, unknown diet or duplicate title.
3. Apply `recipes.sql`. Locally, `supabase db reset` runs it automatically (see
   `[db.seed]` in `config.toml`). For the hosted project, paste it into the SQL editor.

The SQL only inserts titles that aren't already in the catalog, so it is safe to
run again.
