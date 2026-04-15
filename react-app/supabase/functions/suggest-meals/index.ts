// Supabase Edge Function: suggest-meals
// Generates meal suggestions from a household's pantry using Anthropic Claude.
// The LLM is instructed to favor partially-opened and near-expiry items so
// households use what they already have before it spoils.
//
// POST body: {
//   pantry: PantryItemForSuggestion[],
//   mealType?: string,
//   count?: number,
//   dietary?: string,
//   notes?: string,
// }
// Response: MealSuggestionResult
//
// Required secrets:
//   supabase secrets set ANTHROPIC_API_KEY=...
//
// Optional:
//   ANTHROPIC_MODEL (defaults to claude-sonnet-4-6)
//
// Deploy:
//   supabase functions deploy suggest-meals

// @ts-ignore Deno runtime import
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore Deno runtime import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

// @ts-ignore — Deno global
declare const Deno: {
  env: { get(key: string): string | undefined };
};

interface PantryItemPayload {
  name: string;
  brand?: string | null;
  category?: string | null;
  storageZone: string;
  quantity: number;
  unit?: string | null;
  remainingPct: number;
  status: string;
  expirationDate?: string | null;
}

interface RequestBody {
  pantry?: PantryItemPayload[];
  mealType?: string;
  count?: number;
  dietary?: string;
  notes?: string;
}

interface SuggestedIngredient {
  pantryItemName?: string;
  name: string;
  amount?: string;
  missing?: boolean;
  usesOpenItem?: boolean;
}

interface MealSuggestion {
  title: string;
  description: string;
  mealType?: string;
  estimatedTime?: string;
  servings?: number;
  ingredients: SuggestedIngredient[];
  steps: string[];
  useItUpScore: number;
  notes?: string;
}

interface MealSuggestionResult {
  suggestions: MealSuggestion[];
  prioritizedItems: string[];
  model?: string;
}

// ---------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** A simple priority score — higher == more urgent to use. */
function priorityScore(item: PantryItemPayload): number {
  let score = 0;
  if (item.status === 'open') {
    // Open items should be used first; lower remaining % = more urgent.
    score += 50 + (100 - item.remainingPct);
  }
  const days = daysUntil(item.expirationDate);
  if (days !== null) {
    if (days < 0) score -= 1000; // expired — not included anyway
    else if (days <= 3) score += 80;
    else if (days <= 7) score += 40;
    else if (days <= 14) score += 15;
  }
  return score;
}

function formatPantryForPrompt(pantry: PantryItemPayload[]): string {
  // Sort by priority descending so the model sees most-urgent items first.
  const sorted = [...pantry].sort(
    (a, b) => priorityScore(b) - priorityScore(a),
  );
  return sorted
    .map((item) => {
      const parts: string[] = [];
      parts.push(`- ${item.name}`);
      if (item.brand) parts.push(`(${item.brand})`);
      parts.push(`— qty ${item.quantity}${item.unit ? ` ${item.unit}` : ''}`);
      parts.push(`[${item.storageZone}]`);
      parts.push(`[${item.status}`);
      if (item.status === 'open') parts[parts.length - 1] += ` ${item.remainingPct}%`;
      parts[parts.length - 1] += ']';
      const days = daysUntil(item.expirationDate);
      if (days !== null) {
        if (days < 0) parts.push('(expired)');
        else if (days <= 7) parts.push(`(expires in ${days}d)`);
        else parts.push(`(expires ${item.expirationDate})`);
      }
      if (item.category) parts.push(`{${item.category}}`);
      return parts.join(' ');
    })
    .join('\n');
}

function buildUserPrompt(body: RequestBody): string {
  const count = Math.min(Math.max(body.count ?? 3, 1), 6);
  const pantryBlock = formatPantryForPrompt(body.pantry ?? []);

  const lines: string[] = [
    'I want meal ideas using what I already have in my pantry.',
    '',
    'PANTRY INVENTORY (sorted by urgency — use open/near-expiry items FIRST):',
    pantryBlock,
    '',
    `Suggest ${count} meal${count > 1 ? 's' : ''}.`,
  ];

  if (body.mealType) lines.push(`Meal type: ${body.mealType}.`);
  if (body.dietary) lines.push(`Dietary: ${body.dietary}.`);
  if (body.notes) lines.push(`Notes: ${body.notes}.`);

  lines.push(
    '',
    'Priorities, in order:',
    '1. FAVOR partially-opened items (status=open) — they go bad fastest after opening.',
    '2. Then items expiring within 7 days.',
    '3. Then any other pantry items.',
    '4. Only recommend extra ingredients if truly essential; mark them missing=true.',
    '',
    'Respond with ONLY a JSON object matching this TypeScript type, no prose, no code fences:',
    `{
  "suggestions": [{
    "title": string,
    "description": string,
    "mealType": string | undefined,
    "estimatedTime": string | undefined,
    "servings": number | undefined,
    "ingredients": [{
      "pantryItemName": string | undefined,   // exact match from the pantry list above, if any
      "name": string,                         // display name
      "amount": string | undefined,           // e.g. "1 cup", "2 tbsp", "to taste"
      "missing": boolean | undefined,         // true if NOT in the pantry
      "usesOpenItem": boolean | undefined     // true if matched an open pantry item
    }],
    "steps": string[],
    "useItUpScore": number,                   // 0..100 — how well it uses open/near-expiry items
    "notes": string | undefined
  }],
  "prioritizedItems": string[]                // names of pantry items you deliberately used up
}`,
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------
// Anthropic API call
// ---------------------------------------------------------------

const SYSTEM_PROMPT =
  'You are a helpful meal planning assistant. You suggest practical, ' +
  'achievable home recipes based on what the user already has in their pantry. ' +
  'You STRONGLY favor using partially-opened items and ingredients close to ' +
  'their expiration date so nothing goes to waste. You respond only with ' +
  'valid JSON — no markdown, no prose, no code fences.';

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  model?: string;
  stop_reason?: string;
  error?: { message?: string };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  userPrompt: string,
): Promise<{ text: string; model: string }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text}`);
  }

  const json = (await res.json()) as AnthropicResponse;
  if (json.error) throw new Error(`Anthropic error: ${json.error.message}`);

  const textBlock = json.content?.find((c) => c.type === 'text');
  const text = textBlock?.text ?? '';
  if (!text) throw new Error('Anthropic returned no text content');
  return { text, model: json.model ?? model };
}

// ---------------------------------------------------------------
// Response parsing — tolerate accidental fences or prose
// ---------------------------------------------------------------

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip ``` fences if the model added them despite instructions.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced ? fenced[1] : trimmed;
  // Find the first { and last } for robustness against stray prose.
  const first = body.indexOf('{');
  const last = body.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('Model response did not contain a JSON object');
  }
  return JSON.parse(body.slice(first, last + 1));
}

function clampScore(n: unknown): number {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function coerceResult(parsed: unknown): MealSuggestionResult {
  const root = (parsed ?? {}) as Record<string, unknown>;
  const rawSuggestions = Array.isArray(root.suggestions) ? root.suggestions : [];
  const rawPrioritized = Array.isArray(root.prioritizedItems) ? root.prioritizedItems : [];

  const suggestions: MealSuggestion[] = rawSuggestions.map((s) => {
    const obj = (s ?? {}) as Record<string, unknown>;
    const ingredients = Array.isArray(obj.ingredients) ? obj.ingredients : [];
    const steps = Array.isArray(obj.steps) ? obj.steps : [];
    return {
      title: typeof obj.title === 'string' ? obj.title : 'Untitled',
      description: typeof obj.description === 'string' ? obj.description : '',
      mealType: typeof obj.mealType === 'string' ? obj.mealType : undefined,
      estimatedTime: typeof obj.estimatedTime === 'string' ? obj.estimatedTime : undefined,
      servings: typeof obj.servings === 'number' ? obj.servings : undefined,
      ingredients: ingredients.map((i) => {
        const ing = (i ?? {}) as Record<string, unknown>;
        return {
          pantryItemName: typeof ing.pantryItemName === 'string' ? ing.pantryItemName : undefined,
          name: typeof ing.name === 'string' ? ing.name : '',
          amount: typeof ing.amount === 'string' ? ing.amount : undefined,
          missing: typeof ing.missing === 'boolean' ? ing.missing : undefined,
          usesOpenItem: typeof ing.usesOpenItem === 'boolean' ? ing.usesOpenItem : undefined,
        };
      }),
      steps: steps.filter((s): s is string => typeof s === 'string'),
      useItUpScore: clampScore(obj.useItUpScore),
      notes: typeof obj.notes === 'string' ? obj.notes : undefined,
    };
  });

  return {
    suggestions,
    prioritizedItems: rawPrioritized.filter((s): s is string => typeof s === 'string'),
  };
}

// ---------------------------------------------------------------
// Handler
// ---------------------------------------------------------------

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
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const anthropicModel = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6';

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: supabase env missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: ANTHROPIC_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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

    const body = (await req.json()) as RequestBody;
    const pantry = Array.isArray(body?.pantry) ? body.pantry : [];
    if (pantry.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], prioritizedItems: [], model: anthropicModel }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userPrompt = buildUserPrompt(body);
    const { text, model } = await callAnthropic(anthropicKey, anthropicModel, userPrompt);

    const parsed = extractJson(text);
    const result = coerceResult(parsed);

    return new Response(JSON.stringify({ ...result, model }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
