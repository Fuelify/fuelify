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

/** The site refused us (bot protection). Pasting the text is the way round it. */
export class BlockedError extends ImportError {
  constructor(public readonly host: string) {
    super(`${host} blocks automatic imports. Open the recipe on that site, copy the page text, and paste it here instead.`);
  }
}

// Recipe sites commonly turn away requests that don't look like a browser
// (Allrecipes and other Dotdash Meredith sites answer 402). Send ordinary
// browser headers, and try a second profile before giving up.
const BROWSER_PROFILES: Record<string, string>[] = [
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
  },
  {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
];

/** Statuses sites use to turn away automated requests */
const BLOCKED_STATUSES = new Set([401, 402, 403, 406, 429, 451, 999]);

/**
 * GET a page, following a few redirects (each re-checked) and capping the size.
 * Retries with a second browser profile if the site blocks the first.
 * `allowPrivate` exists only so tests can use a local server; the API never sets it.
 */
export async function fetchRecipePage(start: string, { allowPrivate = false } = {}): Promise<{ html: string; finalUrl: string }> {
  let blocked: BlockedError | null = null;
  for (const headers of BROWSER_PROFILES) {
    try {
      return await fetchOnce(start, headers, allowPrivate);
    } catch (err) {
      if (!(err instanceof BlockedError)) throw err;
      blocked = err;
    }
  }
  throw blocked!;
}

async function fetchOnce(start: string, headers: Record<string, string>, allowPrivate: boolean): Promise<{ html: string; finalUrl: string }> {
  let url = new URL(start);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url, allowPrivate);
    const res = await fetch(url, { redirect: 'manual', signal, headers }).catch((err: Error) => {
      throw new ImportError(err.name === 'TimeoutError' ? 'That site took too long to respond.' : 'We couldn’t reach that website.');
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new ImportError('That link redirects somewhere we can’t follow.');
      url = new URL(location, url);
      continue;
    }
    if (BLOCKED_STATUSES.has(res.status)) throw new BlockedError(url.hostname.replace(/^www\./, ''));
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
