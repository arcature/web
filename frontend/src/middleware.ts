import { PUBLIC_SANITY_STUDIO_URL } from 'astro:env/client';
import { defineMiddleware, sequence } from 'astro:middleware';

import generated from './generated/redirects.json';
import {
  compileRedirects,
  findRedirect,
  type Redirect,
  redirectResponse,
  redirectsQuery,
  redirectTable,
} from './lib/redirects';
import { canReadDrafts, client, draftClient } from './lib/sanity';
import { frameAncestors, wantsStega } from './lib/stega';

/**
 * On QA and in dev, decides whether a request gets stega (only inside
 * Presentation; see src/lib/stega.ts) and lets only the Studio frame pages.
 *
 * Answers the redirects kept in Sanity.
 *
 * - Production uses the list the sanity-redirects integration (redirects.mjs)
 *   built from published content, so requests never wait on Sanity.
 * - QA and dev read them from Sanity on each request, drafts included, so a
 *   redirect can be tried before it's published or deployed.
 *
 * Prerendered pages are files, so in production this only sees paths without
 * one, which is where a redirect source lives ([...path].astro).
 *
 * As in FK Kit: matching ignores case and a trailing slash, and the request's
 * query string carries over unless the destination sets the same parameter.
 */

const live = import.meta.env.DEV || Boolean(import.meta.env.SANITY_PREVIEW);
const builtTable = redirectTable(generated as Redirect[]);

async function currentTable() {
  if (!live) {
    return builtTable;
  }

  // Drafts when they can be read, without stega, which would corrupt paths.
  const rules = await (canReadDrafts ? draftClient() : client).fetch(
    redirectsQuery,
  );
  const { redirects, skipped } = compileRedirects(rules);
  for (const message of skipped) {
    console.warn(`[redirects] Skipped ${message}`);
  }

  return redirectTable(redirects);
}

const framing = frameAncestors(PUBLIC_SANITY_STUDIO_URL);

/** QA and dev only: stega inside Presentation, and only the Studio may frame. */
const preview = defineMiddleware(async (context, next) => {
  if (!live || context.isPrerendered) {
    return next();
  }

  context.locals.stega = wantsStega(context.request.headers, context.url);

  const response = await next();
  try {
    response.headers.set('Content-Security-Policy', framing);
    return response;
  } catch {
    // Some responses have immutable headers; copy those first.
    const copy = new Response(response.body, response);
    copy.headers.set('Content-Security-Policy', framing);
    return copy;
  }
});

const redirects = defineMiddleware(async (context, next) => {
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

  const rule = findRedirect(table, url.pathname);

  // QA and dev never cache: their redirects can change at any time.
  return rule ? redirectResponse(rule, url, !live) : next();
});

export const onRequest = sequence(preview, redirects);
