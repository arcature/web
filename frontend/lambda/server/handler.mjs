// Lambda entry for both stages (see sst.config.ts). Wraps the Astro Node
// adapter's standalone handler, which serves dist/client (the prerendered pages
// and assets) and renders anything else.
//
// The adapter finds the static files by walking up to a folder named "server"
// and looking for "../client", so this file lives in lambda/server/ and
// sst.config.ts copies dist/client to lambda/client.
import serverless from 'serverless-http';

import { handler as astro } from '../../dist/server/entry.mjs';

// Set on the QA stage only.
const isPreview = process.env.SANITY_PREVIEW === 'true';

export const handler = serverless(
  (req, res) => {
    if (isPreview) {
      // Drafts depend on a cookie, so nothing on QA may be cached or indexed.
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    return astro(req, res);
  },
  { binary: true },
);
