/**
 * Where content lives on the site: the one copy of the route rules, imported by
 * the Studio (Presentation's document routes and locations) and available to
 * the frontend for building links.
 *
 * Adding a page means adding it here: a singleton page to `fixedPages`, or a
 * type with a page per document to `slugRoutes`. Presentation then knows which
 * document a URL shows and where each document is used, with no other Studio
 * changes. The frontend still needs its Astro route.
 *
 * A plain directory rather than an npm workspace: both the Studio and the
 * frontend bundle it with Vite, so there's nothing to install or build.
 */

/** A singleton page, pinned to a path by its document ID. */
export interface FixedPage {
  /** Document ID, which for singletons is also the type name. */
  id: string;
  title: string;
  path: string;
}

export const fixedPages: readonly FixedPage[] = [
  { id: 'homePage', title: 'Home page', path: '/' },
  { id: 'notFoundPage', title: '404 page', path: '/404' },
];

/**
 * Document types with a page per document, keyed by type, valued by the base
 * path their slugs sit under: `'blog'` for `/blog/<slug>`, `''` for `/<slug>`.
 * Each type needs a `slug` field.
 *
 * @example { page: '', post: 'blog' }
 */
export const slugRoutes: Readonly<Record<string, string>> = {};

export interface RouteRules {
  fixedPages: readonly FixedPage[];
  slugRoutes: Readonly<Record<string, string>>;
}

export const siteRoutes: RouteRules = { fixedPages, slugRoutes };

/** Every type that has pages. */
export const pageTypes = (rules: RouteRules = siteRoutes): string[] => [
  ...rules.fixedPages.map((page) => page.id),
  ...Object.keys(rules.slugRoutes),
];

/**
 * A draft or Content Release version has the published ID behind a prefix
 * (`drafts.<id>`, `versions.<release>.<id>`).
 */
export const publishedId = (id: string | undefined) =>
  (id ?? '').replace(/^(drafts|versions\.[^.]+)\./, '');

const slugPath = (base: string, slug: string) =>
  base ? `/${base}/${slug}` : `/${slug}`;

export interface DocumentPathRef {
  _id?: string;
  _type?: string;
  slug?: string | { current?: string } | null;
}

/**
 * The path a document is shown at, or null when it has no page of its own
 * (settings, navigation, redirects, a slugged page without a slug yet).
 */
export function documentPath(
  doc: DocumentPathRef | null | undefined,
  rules: RouteRules = siteRoutes,
): string | null {
  if (!doc) {
    return null;
  }

  const fixed = rules.fixedPages.find(
    (page) => page.id === publishedId(doc._id),
  );
  if (fixed) {
    return fixed.path;
  }

  const base = doc._type ? rules.slugRoutes[doc._type] : undefined;
  const slug = typeof doc.slug === 'string' ? doc.slug : doc.slug?.current;

  return base !== undefined && slug ? slugPath(base, slug) : null;
}

/** A URL pattern and the GROQ filter for the document it shows. */
export interface DocumentRoute {
  route: string;
  filter: string;
}

/**
 * The document each URL shows, for Presentation's `mainDocuments`.
 * Presentation takes the first route that matches, so fixed pages come first,
 * then slugged types with the longest base first, and a root-level type
 * (`/:slug`) last, where it can't swallow a prefixed path.
 */
export function documentRoutes(
  rules: RouteRules = siteRoutes,
): DocumentRoute[] {
  const slugged = Object.entries(rules.slugRoutes)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([type, base]) => ({
      route: slugPath(base, ':slug'),
      filter: `_type == "${type}" && slug.current == $slug`,
    }));

  return [
    ...rules.fixedPages.map((page) => ({
      route: page.path,
      filter: `_id == "${page.id}"`,
    })),
    ...slugged,
  ];
}
