// Server-only: fetch a user-supplied recipe page safely (public hosts only,
// re-checked on every redirect, time- and size-limited).

import { lookup } from 'node:dns/promises';
import { isPrivateAddress, recipeUrlError } from '@fuelify/shared';

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 10_000;

/** A failure we can explain to the user. */
export class ImportError extends Error {}

/** Reject non-public URLs, including hostnames that resolve to private addresses. */
async function assertPublic(url: URL, allowPrivate: boolean) {
  if (allowPrivate) return;
  const problem = recipeUrlError(url.href);
  if (problem) throw new ImportError(problem);
  const addresses = await lookup(url.hostname, { all: true }).catch(() => {
    throw new ImportError('We couldn’t find that website. Check the link and try again.');
  });
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new ImportError('That address isn’t a public website.');
}

/**
 * GET a page, following a few redirects (each re-checked) and capping the size.
 * `allowPrivate` exists only so tests can use a local server; the API never sets it.
 */
export async function fetchRecipePage(start: string, { allowPrivate = false } = {}): Promise<{ html: string; finalUrl: string }> {
  let url = new URL(start);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url, allowPrivate);
    const res = await fetch(url, {
      redirect: 'manual',
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FuelifyRecipeImport/1.0; +https://fuelify-murex.vercel.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    }).catch((err: Error) => {
      throw new ImportError(err.name === 'TimeoutError' ? 'That site took too long to respond.' : 'We couldn’t reach that website.');
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new ImportError('That link redirects somewhere we can’t follow.');
      url = new URL(location, url);
      continue;
    }
    if (!res.ok) throw new ImportError(`That site returned an error (${res.status}). Try copying the recipe text instead.`);
    const type = res.headers.get('content-type') ?? '';
    if (!/html|xml/i.test(type)) throw new ImportError('That link isn’t a web page.');

    const reader = res.body?.getReader();
    if (!reader) throw new ImportError('That page was empty.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break; // Recipe JSON-LD sits in <head>; the first few MB are plenty
      }
      chunks.push(value);
    }
    return { html: new TextDecoder().decode(Buffer.concat(chunks)), finalUrl: url.href };
  }
  throw new ImportError('That link redirects too many times.');
}

