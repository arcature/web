// Production's redirects: this integration reads the published redirects from
// Sanity once per build and writes src/generated/redirects.json, which
// src/middleware.ts matches requests against, so production never queries
// Sanity for them and a published redirect takes effect at the next deploy.
// QA and dev read them live instead (see src/middleware.ts).

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { createClient } from '@sanity/client';

import { compileRedirects, redirectsQuery } from './src/lib/redirects.ts';

/**
 * @param {{ projectId: string, dataset: string }} sanity
 * @returns {import('astro').AstroIntegration}
 */
export function sanityRedirects({ projectId, dataset }) {
  return {
    name: 'sanity-redirects',
    hooks: {
      'astro:config:setup': async ({ command, config, logger }) => {
        let redirects = [];

        try {
          const client = createClient({
            projectId,
            dataset,
            apiVersion: '2026-09-01',
            useCdn: false,
            perspective: 'published',
          });
          const compiled = compileRedirects(await client.fetch(redirectsQuery));
          redirects = compiled.redirects;
          for (const message of compiled.skipped) {
            logger.warn(`Skipped redirect ${message}`);
          }
        } catch (error) {
          // A build must not ship without its redirects; dev can carry on.
          if (command === 'build') throw error;
          logger.warn(`Redirects not loaded: ${error.message}`);
        }

        const file = new URL('generated/redirects.json', config.srcDir);
        await mkdir(new URL('.', file), { recursive: true });
        await writeFile(
          fileURLToPath(file),
          `${JSON.stringify(redirects, null, 2)}\n`,
        );
        logger.info(`Wrote ${redirects.length} redirect(s)`);
      },
    },
  };
}
