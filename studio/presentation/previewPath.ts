import {
  documentPath,
  type DocumentPathRef,
  fixedPages,
  pageTypes,
} from '../../shared/routes';

/**
 * Documents shown on every page rather than a page of their own, with how the
 * Studio describes them. They preview on the home page.
 */
export const siteWideTypes: Record<string, string> = {
  siteSettings: 'Used on every page.',
  mainNavigation: 'The header on every page.',
  footerNavigation: 'The footer on every page.',
};

/** Types that get a Preview tab: every page type, plus the site-wide ones. */
export const previewableTypes = new Set<string>([
  ...pageTypes(),
  ...Object.keys(siteWideTypes),
]);

const homePath = fixedPages[0]?.path ?? '/';

/**
 * The page the Preview tab shows for a document, or an Error saying why there
 * isn't one (a slugged page without its slug yet).
 */
export function previewPath(doc: DocumentPathRef): string | Error {
  if (doc._type && siteWideTypes[doc._type]) {
    return homePath;
  }

  return documentPath(doc) ?? new Error('Add a slug to preview this document.');
}
