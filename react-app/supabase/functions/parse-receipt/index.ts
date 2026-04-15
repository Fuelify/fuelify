// Supabase Edge Function: parse-receipt
// Proxies Mindee Receipt Parser API to keep MINDEE_API_KEY server-side.
// POST body: { imageBase64: string }
// Response:  ReceiptParseResult
//
// Required secrets:
//   supabase secrets set MINDEE_API_KEY=...
//
// Deploy:
//   supabase functions deploy parse-receipt

// @ts-ignore Deno runtime import
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore Deno runtime import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

// @ts-ignore — Deno global
declare const Deno: {
  env: { get(key: string): string | undefined };
};

interface MindeeField<T = string | number> {
  value?: T | null;
  confidence?: number;
}

interface MindeeLineItem {
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_amount?: number | null;
}

interface MindeePrediction {
  supplier_name?: MindeeField<string>;
  date?: MindeeField<string>;
  total_amount?: MindeeField<number>;
  line_items?: MindeeLineItem[];
}

interface MindeeResponse {
  document?: {
    inference?: {
      prediction?: MindeePrediction;
    };
  };
  api_request?: { status_code?: number };
}

const KEYWORD_CATEGORIES: Array<[RegExp, string]> = [
  [/\b(milk|cheese|yogurt|butter|cream|dairy)\b/i, 'Dairy'],
  [/\beggs?\b/i, 'Eggs'],
  [/\b(chicken|beef|pork|turkey|bacon|sausage|ham|steak|ground|salmon|tuna|fish|shrimp)\b/i, 'Meat & Seafood'],
  [/\b(apple|banana|orange|lettuce|spinach|tomato|onion|pepper|carrot|broccoli|potato|produce|kale|cucumber)\b/i, 'Produce'],
  [/\b(bread|bagel|roll|bun|baguette|muffin|croissant)\b/i, 'Bread & Bakery'],
  [/\b(juice|soda|coffee|tea|water|beer|wine|kombucha)\b/i, 'Beverages'],
  [/\b(chips|crackers|cookies|candy|chocolate|pretzels|popcorn)\b/i, 'Snacks'],
  [/\b(pasta|rice|noodle|cereal|oats|quinoa|flour)\b/i, 'Grains & Pasta'],
  [/\b(canned|can of|jar of|soup|beans|tomato sauce)\b/i, 'Canned & Jarred'],
  [/\b(ketchup|mustard|mayo|mayonnaise|dressing|sauce|syrup|honey|jam)\b/i, 'Condiments & Sauces'],
  [/\b(salt|pepper|spice|seasoning|paprika|cumin|oregano)\b/i, 'Spices & Seasonings'],
  [/\b(sugar|baking|yeast|vanilla|cocoa)\b/i, 'Baking'],
  [/\bfrozen\b/i, 'Frozen Meals'],
  [/\b(deli|salami|prosciutto|pastrami)\b/i, 'Deli'],
];

function suggestCategory(description: string): string | undefined {
  for (const [pattern, cat] of KEYWORD_CATEGORIES) {
    if (pattern.test(description)) return cat;
  }
  return undefined;
}

function decodeBase64(b64: string): Uint8Array {
  const cleaned = b64.replace(/^data:[^;]+;base64,/, '');
  const bin = atob(cleaned);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const mindeeKey = Deno.env.get('MINDEE_API_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: supabase env missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!mindeeKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: MINDEE_API_KEY not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { imageBase64 } = body ?? {};
    if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bytes = decodeBase64(imageBase64);
    const formData = new FormData();
    formData.append('document', new Blob([bytes], { type: 'image/jpeg' }), 'receipt.jpg');

    const mindeeRes = await fetch(
      'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
      {
        method: 'POST',
        headers: { Authorization: `Token ${mindeeKey}` },
        body: formData,
      },
    );

    if (!mindeeRes.ok) {
      const text = await mindeeRes.text();
      return new Response(
        JSON.stringify({ error: `Mindee error: ${mindeeRes.status}`, detail: text }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const mindeeJson = (await mindeeRes.json()) as MindeeResponse;
    const prediction = mindeeJson.document?.inference?.prediction ?? {};

    const lineItems = (prediction.line_items ?? [])
      .filter((li) => !!li.description && li.description.trim().length > 0)
      .map((li) => ({
        description: (li.description ?? '').trim(),
        quantity: li.quantity ?? undefined,
        unitPrice: li.unit_price ?? undefined,
        total: li.total_amount ?? undefined,
        suggestedCategory: suggestCategory(li.description ?? ''),
      }));

    const result = {
      merchantName: prediction.supplier_name?.value ?? undefined,
      date: prediction.date?.value ?? undefined,
      total: prediction.total_amount?.value ?? undefined,
      lineItems,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
