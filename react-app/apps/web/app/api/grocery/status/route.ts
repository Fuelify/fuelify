// GET /api/grocery/status → which stores this server is connected to (no secrets).

import { providerStatus } from '@/lib/grocery';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(providerStatus());
}
