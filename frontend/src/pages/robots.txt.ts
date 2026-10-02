import type { APIRoute } from 'astro';

import { getSite } from '../lib/content';

export const GET: APIRoute = async () => {
  const site = await getSite();
  // QA shows drafts, so it's never crawled, whatever Site settings say.
  const hidden = site.noIndex || Boolean(import.meta.env.SANITY_PREVIEW);
  const rule = hidden ? 'Disallow: /' : 'Allow: /';

  return new Response(`User-agent: *\n${rule}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
