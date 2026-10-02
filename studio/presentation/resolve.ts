import { map, type Observable } from 'rxjs';
import {
  defineDocuments,
  type DocumentLocation,
  type DocumentLocationResolver,
  type DocumentLocationsState,
  type PresentationPluginOptions,
} from 'sanity/presentation';

import {
  documentPath,
  documentRoutes,
  fixedPages,
  pageTypes,
  publishedId,
} from '../../shared/routes';

/**
 * How Presentation maps between URLs and documents, in both directions, from
 * the route rules in shared/routes.ts. Adding a page there is all it takes;
 * nothing here names a page or a type that has pages.
 */

/** Documents shown on every page rather than on pages that reference them. */
const siteWideMessages: Record<string, string> = {
  siteSettings: 'Used on every page.',
  mainNavigation: 'The header on every page.',
  footerNavigation: 'The footer on every page.',
};

/** Documents with no page to show them on. */
const noPageMessages: Record<string, string> = {
  redirect:
    'Works on QA straight away, even unpublished; on the live site after it’s published and deployed.',
};

/** Referring pages listed; the rest are counted in the message. */
const MAX_REFERRERS = 10;

const pageFields = `_id, _type, "slug": slug.current, title`;

const usageQuery = `{
  "doc": *[_id == $id][0]{ ${pageFields} },
  "referrers": *[references($id) && _id != $id && _type in $pageTypes] | order(_updatedAt desc) [0...$max]{ ${pageFields} },
  "referrerCount": count(*[references($id) && _id != $id && _type in $pageTypes])
}`;

interface PageDocument {
  _id: string;
  _type: string;
  slug?: string | null;
  title?: string | null;
}

interface Usage {
  doc: PageDocument | null;
  referrers: PageDocument[];
  referrerCount: number;
}

const fixedTitle = new Map(fixedPages.map((page) => [page.id, page.title]));

function toLocation(doc: PageDocument | null): DocumentLocation | null {
  const href = documentPath(doc);
  if (!doc || !href) {
    return null;
  }

  const title = fixedTitle.get(publishedId(doc._id)) ?? doc.title ?? 'Untitled';

  return { title, href };
}

function uniqueByHref(locations: (DocumentLocation | null)[]) {
  const seen = new Set<string>();
  return locations.filter((location): location is DocumentLocation => {
    if (!location || seen.has(location.href)) {
      return false;
    }
    seen.add(location.href);
    return true;
  });
}

function usageState({
  doc,
  referrers,
  referrerCount,
}: Usage): DocumentLocationsState | null {
  const locations = uniqueByHref([
    toLocation(doc),
    ...referrers.map(toLocation),
  ]);

  if (locations.length === 0) {
    return null;
  }

  const total =
    locations.length + Math.max(0, referrerCount - referrers.length);

  return {
    locations,
    // Presentation's own "Used on N pages" only counts what's listed.
    message:
      total > locations.length
        ? `Used on ${total} pages, ${locations.length} shown`
        : undefined,
  };
}

/**
 * The "Used on" list on every document, and the pages Presentation offers to
 * open it on: its own page, then the pages that reference it, most recently
 * edited first. Site-wide documents list the fixed pages instead.
 */
const locations: DocumentLocationResolver = (
  { id, type, perspectiveStack, variant },
  { documentStore },
) => {
  if (siteWideMessages[type]) {
    return {
      locations: fixedPages.map(({ title, path }) => ({ title, href: path })),
      message: siteWideMessages[type],
    };
  }
  if (noPageMessages[type]) {
    return { message: noPageMessages[type] };
  }

  const usage = documentStore.listenQuery(
    usageQuery,
    { id, pageTypes: pageTypes(), max: MAX_REFERRERS },
    { perspective: perspectiveStack, variant },
  ) as Observable<Usage>;

  return usage.pipe(map(usageState));
};

export const resolve: PresentationPluginOptions['resolve'] = {
  mainDocuments: defineDocuments(documentRoutes()),
  locations,
};
