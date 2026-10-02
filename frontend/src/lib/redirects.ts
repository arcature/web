// Redirects kept in Sanity (Site settings → Redirects), shared by the
// sanity-redirects integration (redirects.mjs), which writes production's list
// at build time, and src/middleware.ts, which reads them live on QA and in dev.
//
// The rules restate the Studio's validation (studio/schemaTypes/redirect.ts),
// since a document written through the API skips it. A rule that fails is left
// out and reported.

import { defineQuery } from 'groq';

export const redirectsQuery = defineQuery(
  `*[_type == "redirect" && defined(source.current) && defined(destination)]{
    "source": source.current,
    destination,
    permanent
  } | order(_createdAt asc)`,
);

export interface Redirect {
  source: string;
  destination: string;
  status: 301 | 302;
}

interface Rule {
  source: string | null;
  destination: string | null;
  permanent: boolean | null;
}

const isPath = (value: string) =>
  value.startsWith('/') && !value.startsWith('//');

/** As requests are matched: case-insensitive, no trailing slash. */
export const matchKey = (path: string) =>
  (path.length > 1 ? path.replace(/\/+$/, '') : path).toLowerCase();

/** Why a rule can't be used, or undefined if it can. */
function problem({ source, destination }: Rule): string | undefined {
  if (typeof source !== 'string' || !isPath(source)) {
    return 'source must be a path starting with /';
  }
  if (source === '/' || /[?#]/.test(source)) {
    return 'source must be a page path, without a query string';
  }
  if (source.startsWith('/api/') || source.startsWith('/_')) {
    return 'paths under /api/ and /_ are never redirected';
  }
  if (
    typeof destination !== 'string' ||
    !(isPath(destination) || /^https?:\/\//i.test(destination))
  ) {
    return 'destination must be a path or an http(s) URL';
  }
  if (
    isPath(destination) &&
    !destination.includes('?') &&
    matchKey(destination.replace(/#.*$/, '')) === matchKey(source)
  ) {
    return 'destination is the same as the source';
  }
  return undefined;
}

/** The usable rules. A duplicate source keeps the oldest rule. */
export function compileRedirects(rules: Rule[]): {
  redirects: Redirect[];
  skipped: string[];
} {
  const redirects: Redirect[] = [];
  const seen = new Set<string>();
  const skipped: string[] = [];

  for (const rule of rules) {
    const reason =
      problem(rule) ??
      (seen.has(matchKey(rule.source!)) ? 'duplicate source' : undefined);

    if (reason) {
      skipped.push(`${rule.source}: ${reason}`);
      continue;
    }

    seen.add(matchKey(rule.source!));
    redirects.push({
      source: rule.source!,
      destination: rule.destination!,
      status: rule.permanent === false ? 302 : 301,
    });
  }

  return { redirects, skipped };
}

/** Rules by match key, for lookups. */
export const redirectTable = (redirects: Redirect[]) =>
  new Map(redirects.map((rule) => [matchKey(rule.source), rule] as const));

function decode(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

/** The rule for a request path, if any. */
export const findRedirect = (
  table: Map<string, Redirect>,
  pathname: string,
): Redirect | undefined => table.get(matchKey(decode(pathname)));

/**
 * The redirect response for a matched rule. The request's query string carries
 * over unless the destination sets the same parameter, and a same-site
 * destination stays relative so it follows the visitor's host. `cacheable`
 * lets CloudFront hold a 301 for an hour (production only).
 */
export function redirectResponse(
  rule: Redirect,
  url: URL,
  cacheable: boolean,
): Response {
  const target = new URL(rule.destination, url);
  for (const [name, value] of url.searchParams) {
    if (!target.searchParams.has(name)) {
      target.searchParams.append(name, value);
    }
  }

  const location =
    target.origin === url.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : target.toString();

  return new Response(null, {
    status: rule.status,
    headers: {
      Location: location,
      'Cache-Control':
        rule.status === 301 && cacheable ? 'public, max-age=3600' : 'no-store',
    },
  });
}
