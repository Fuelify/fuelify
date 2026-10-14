// POST /api/receipts/parse { image: base64 JPEG/PNG/WebP } → ReceiptReading
// Reads a grocery receipt photo with Claude (vision + structured output):
// store, date, and each item with a plain name and the price paid.
// Env: ANTHROPIC_API_KEY. Signed-in users only.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import { signedInUser } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_IMAGE_CHARS = 6_000_000; // ~4.5 MB of image

const Receipt = z.object({
  is_receipt: z.boolean().describe('False if the photo is not a store receipt'),
  store_name: z.string().nullable().describe('Store or chain name as printed, e.g. "TRADER JOE\'S #712"'),
  date: z.string().nullable().describe('Purchase date as YYYY-MM-DD, or null if not printed'),
  total: z.number().nullable().describe('Receipt total paid'),
  items: z.array(
    z.object({
      receipt_text: z.string().describe('The line exactly as printed'),
      name: z.string().describe('Plain grocery name a shopper would write on a list, lower case, e.g. "organic bananas", "whole milk", "sourdough bread"'),
      brand: z.string().nullable(),
      quantity: z.number().describe('How many were bought (count, or weight in lb for weighed items)'),
      unit_price: z.number().nullable().describe('Price for one unit (or per lb), after any discount on that line'),
      line_total: z.number().nullable().describe('Amount charged for the line, after any discount on that line'),
      size: z.string().nullable().describe('Package size if printed, e.g. "16 oz", "1 gal"'),
      category: z.string().nullable().describe('Grocery aisle, e.g. Produce, Dairy, Meat & Seafood, Bakery, Frozen, Pantry, Snacks, Beverages, Household'),
    }),
  ),
});

export type ReceiptReading = z.infer<typeof Receipt>;

const INSTRUCTIONS = `Read this grocery receipt photo and list what was bought.
- One entry per purchased product. Skip subtotals, tax, totals, payment, change, bag fees, deposits/bottle fees, loyalty points and coupons that are not tied to a line.
- When a discount or coupon line applies to the product above it, subtract it from that product's price instead of listing it.
- "name" is how a person would write the item on a shopping list: expand abbreviations ("ORG BNNA" → "organic bananas", "GV WHL MLK" → "whole milk"); leave out brand and size.
- For weighed items (e.g. "1.32 lb @ 0.69/lb") quantity is the weight and unit_price the price per lb.
- If a value isn't printed or can't be read, use null rather than guessing.
- If the photo isn't a receipt, set is_receipt to false and return no items.`;

export async function POST(request: Request) {
  const userId = await signedInUser(request);
  if (!userId) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Receipt reading isn’t set up yet.', notConfigured: true }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { image?: unknown; mediaType?: unknown } | null;
  const image = typeof body?.image === 'string' ? body.image.replace(/^data:[^,]+,/, '') : '';
  const mediaType = body?.mediaType === 'image/png' || body?.mediaType === 'image/webp' ? body.mediaType : 'image/jpeg';
  if (!image || image.length > MAX_IMAGE_CHARS || !/^[A-Za-z0-9+/=\s]+$/.test(image.slice(0, 200))) {
    return Response.json({ error: 'Send a photo of the receipt (under 4 MB).' }, { status: 400 });
  }

  const client = new Anthropic();
  try {
    const message = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(Receipt) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image.replace(/\s/g, '') } },
            { type: 'text', text: INSTRUCTIONS },
          ],
        },
      ],
    });
    if (message.stop_reason === 'refusal') return Response.json({ error: 'Couldn’t read that receipt. Try another photo.' }, { status: 422 });
    const reading = message.parsed_output;
    if (!reading) return Response.json({ error: 'Couldn’t read that receipt. Try a clearer photo.' }, { status: 422 });
    if (!reading.is_receipt) return Response.json({ error: 'That doesn’t look like a receipt.' }, { status: 422 });
    return Response.json(reading);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return Response.json({ error: 'Busy right now. Try again in a minute.' }, { status: 429 });
    if (err instanceof Anthropic.APIError) {
      console.error('Receipt read failed', err.status, err.message);
      return Response.json({ error: 'Couldn’t read that receipt. Try again.' }, { status: 502 });
    }
    console.error('Receipt read failed', err);
    return Response.json({ error: 'Couldn’t read that receipt. Try again.' }, { status: 500 });
  }
}
