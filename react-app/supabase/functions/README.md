# Supabase Edge Functions

## parse-receipt

Proxies the [Mindee Receipt Parser](https://developers.mindee.com/docs/receipt-ocr) API.

### Setup

```sh
# One-time: set the Mindee API token as a secret
supabase secrets set MINDEE_API_KEY=<your-mindee-token>

# Deploy
supabase functions deploy parse-receipt
```

### Contract

- `POST /functions/v1/parse-receipt` with JSON body `{ imageBase64: string }`.
- Caller must be authenticated (JWT verified).
- Returns `ReceiptParseResult` (`{ merchantName?, date?, total?, lineItems: [...] }`).

Clients call this via `ReceiptParser` from `@fuelify/shared`.

## suggest-meals

Generates pantry-based meal suggestions via Anthropic Claude. The LLM is
instructed to favor partially-opened items and ingredients close to their
expiration date so households use what they have.

### Setup

```sh
# One-time: set the Anthropic API key as a secret
supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-key>

# Optional — override the model (defaults to claude-sonnet-4-6)
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6

# Deploy
supabase functions deploy suggest-meals
```

### Contract

- `POST /functions/v1/suggest-meals` with JSON body
  `{ pantry: PantryItemForSuggestion[], mealType?, count?, dietary?, notes? }`.
- Caller must be authenticated (JWT verified).
- Returns `MealSuggestionResult`
  (`{ suggestions: [...], prioritizedItems: string[], model? }`).

Clients call this via `MealSuggester` from `@fuelify/shared`.
