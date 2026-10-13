// GET /api/barcode?code=016000275287 → { product, source } | { product: null }
// Signed-in users. See lib/barcode.ts for where products come from.

import { findProduct } from '@/lib/barcode';
import { signedInUser } from '@/lib/server-auth';

export const maxDuration = 20;

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !(await signedInUser(request))) return Response.json({ error: 'Sign in to look up barcodes.' }, { status: 401 });
  const code = new URL(request.url).searchParams.get('code')?.trim() ?? '';
  if (!/^\d{8,14}$/.test(code)) return Response.json({ error: 'That doesn’t look like a product barcode.' }, { status: 400 });
  try {
    const found = await findProduct(code, token);
    return Response.json(found ?? { product: null });
  } catch {
    return Response.json({ error: 'Couldn’t look that up right now. Add it by hand.' }, { status: 502 });
  }
}
