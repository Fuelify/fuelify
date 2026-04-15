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
