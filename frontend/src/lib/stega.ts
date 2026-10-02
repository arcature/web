import { PREVIEW_TAB_PARAM, PREVIEW_TAB_VALUE } from '../../../shared/preview';

/**
 * Whether a QA or dev request should render stega: only inside Presentation,
 * where click-to-edit needs it. The invisible characters take letter spacing
 * like any other, which shifts headings, so a page opened directly, or in the
 * Studio's Preview tab (marked by its query parameter), renders without them.
 *
 * Browsers say what's loading a page in `Sec-Fetch-Dest`: `iframe` inside the
 * Studio, `document` for a page opened directly. `frame-ancestors` (below)
 * keeps any other site from framing QA, so a frame means the Studio.
 */
export function wantsStega(headers: Headers, url: URL): boolean {
  return (
    headers.get('sec-fetch-dest') === 'iframe' &&
    url.searchParams.get(PREVIEW_TAB_PARAM) !== PREVIEW_TAB_VALUE
  );
}

/** The Studio's dev server, which frames local dev. */
const LOCAL_STUDIO = 'http://localhost:3333';

/**
 * The Content-Security-Policy that lets only the Studio (deployed or local)
 * frame the page, since QA shows unpublished drafts.
 */
export function frameAncestors(studioUrl: string): string {
  let deployed = '';
  try {
    deployed = new URL(studioUrl).origin;
  } catch {
    // No usable Studio URL: only the local Studio may frame the page.
  }

  return ['frame-ancestors', deployed, LOCAL_STUDIO].filter(Boolean).join(' ');
}
