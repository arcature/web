// Lambda entry for the preview stage (see sst.config.ts). Wraps the Astro Node
// adapter's standalone handler, which renders pages and serves dist/client.
//
// The adapter finds the static files by walking up to a folder named "server"
// and looking for "../client", so this file lives in lambda/server/ and
// sst.config.ts copies dist/client to lambda/client.
import serverless from 'serverless-http';
import { handler as astro } from '../../dist/server/entry.mjs';

export const handler = serverless(
  (req, res) => {
    // Drafts depend on a cookie, so nothing here may be cached or indexed.
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');

    return astro(req, res);
  },
  { binary: true },
);
