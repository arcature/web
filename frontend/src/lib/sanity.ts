import { createClient } from '@sanity/client';
import {
  PUBLIC_SANITY_DATASET,
  PUBLIC_SANITY_PROJECT_ID,
  PUBLIC_SANITY_STUDIO_URL,
} from 'astro:env/client';
import { SANITY_API_READ_TOKEN } from 'astro:env/server';

export const client = createClient({
  projectId: PUBLIC_SANITY_PROJECT_ID,
  dataset: PUBLIC_SANITY_DATASET,
  apiVersion: '2026-09-01',
  useCdn: false,
  perspective: 'published',
});

/** Whether drafts can be read at all (QA, and local dev with a token in .env). */
export const canReadDrafts = Boolean(SANITY_API_READ_TOKEN);

/** Drafts, with stega (click-to-edit markers) only when asked for. */
export const draftClient = (stega = false) =>
  client.withConfig({
    token: SANITY_API_READ_TOKEN,
    perspective: 'drafts',
    stega: {
      enabled: stega,
      studioUrl: PUBLIC_SANITY_STUDIO_URL,
      // Values used as classes, conditions or URLs must stay clean.
      filter: (props) => {
        const key = props.sourcePath.at(-1);

        if (
          key === 'href' ||
          key === 'accent' ||
          key === 'imageSide' ||
          key === 'platform' ||
          key === 'username'
        ) {
          return false;
        }

        return props.filterDefault(props);
      },
    },
  });

/**
 * Whether this build shows drafts: QA (SANITY_PREVIEW builds) always does, as
 * does local dev, given a token to read them with. Production never does.
 */
export const showDrafts =
  (import.meta.env.DEV || Boolean(import.meta.env.SANITY_PREVIEW)) &&
  canReadDrafts;
