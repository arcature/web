import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@sanity/client';
import type { AstroCookies } from 'astro';
import { PUBLIC_SANITY_DATASET, PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_STUDIO_URL } from 'astro:env/client';
import { SANITY_API_READ_TOKEN } from 'astro:env/server';

export const client = createClient({
  projectId: PUBLIC_SANITY_PROJECT_ID,
  dataset: PUBLIC_SANITY_DATASET,
  apiVersion: '2026-09-01',
  useCdn: false,
  perspective: 'published',
});

export const draftClient = () =>
  client.withConfig({
    token: SANITY_API_READ_TOKEN,
    perspective: 'drafts',
    stega: {
      enabled: true,
      studioUrl: PUBLIC_SANITY_STUDIO_URL,
      // Values used as classes, conditions or URLs must stay clean.
      filter: (props) => {
        const key = props.sourcePath.at(-1);

        if (key === 'href' || key === 'accent' || key === 'imageSide') {
          return false;
        }

        return props.filterDefault(props);
      },
    },
  });

// Draft mode is a cookie set by /api/draft-mode/enable once Presentation's
// preview secret checks out. Its value is derived from the read token, so it
// can't be forged and stops working when the token is rotated.
export const DRAFT_MODE_COOKIE = 'sanity-draft-mode';

export function draftModeCookieValue(): string | undefined {
  return SANITY_API_READ_TOKEN
    ? createHmac('sha256', SANITY_API_READ_TOKEN).update(DRAFT_MODE_COOKIE).digest('hex')
    : undefined;
}

export interface RequestContext {
  cookies: AstroCookies;
  isPrerendered: boolean;
}

export function isDraftMode({ cookies, isPrerendered }: RequestContext): boolean {
  if (isPrerendered) {
    return false;
  }

  const expected = draftModeCookieValue();
  const actual = cookies.get(DRAFT_MODE_COOKIE)?.value;

  if (!expected || !actual || actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
