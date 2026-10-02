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
