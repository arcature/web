import { defineMiddleware } from 'astro:middleware';

import generated from './generated/redirects.json';
import {
  compileRedirects,
  matchKey,
  type Redirect,
  redirectsQuery,
  redirectTable,
} from './lib/redirects';
import { canReadDrafts, client, draftClient } from './lib/sanity';

/**
 * Answers the redirects kept in Sanity, including in draft mode.
 *
 * - Production uses the list the sanity-redirects integration (redirects.mjs)
 *   built from published content, so requests never wait on Sanity.
 * - QA and dev read them from Sanity on each request, drafts included, so a
 *   redirect can be tried before it's published or deployed.
 *
 * Prerendered pages are files, so in production this only sees paths without
 * one, which is where a redirect source lives ([...path].astro).
 *
 * As clio's: matching ignores case and a trailing slash, and the request's
 * query string carries over unless the destination sets the same parameter.
 */

const live = import.meta.env.DEV || Boolean(import.meta.env.SANITY_PREVIEW);
const builtTable = redirectTable(generated as Redirect[]);

async function currentTable() {
  if (!live) {
    return builtTable;
  }

  // Drafts when they can be read. Stega off: it would corrupt the paths.
  const rules = await (canReadDrafts ? draftClient() : client).fetch(
    redirectsQuery,
    {},
    { stega: false },
  );
  const { redirects, skipped } = compileRedirects(rules);
  for (const message of skipped) {
    console.warn(`[redirects] Skipped ${message}`);
  }

  return redirectTable(redirects);
}

function decode(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;

  if (
    context.isPrerendered ||
    (request.method !== 'GET' && request.method !== 'HEAD') ||
    url.pathname.startsWith('/_') ||
    url.pathname.startsWith('/api/')
  ) {
    return next();
  }

  let table: Map<string, Redirect>;
  try {
    table = await currentTable();
  } catch (error) {
    // Sanity unreachable on QA or in dev: serve the page rather than fail.
    console.error('[redirects] Could not load redirects', error);
    return next();
  }

  const rule = table.get(matchKey(decode(url.pathname)));

  if (!rule) {
    return next();
  }

  const target = new URL(rule.destination, url);
  for (const [name, value] of url.searchParams) {
    if (!target.searchParams.has(name)) {
      target.searchParams.append(name, value);
    }
  }

  // Same-site destinations stay relative, so they follow the visitor's host.
  const location =
    target.origin === url.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : target.toString();

  return new Response(null, {
    status: rule.status,
    headers: {
      Location: location,
      // CloudFront may hold a permanent redirect for an hour in production.
      // QA and dev never cache, since their redirects can change at any time.
      'Cache-Control':
        rule.status === 301 && !live ? 'public, max-age=3600' : 'no-store',
    },
  });
});
