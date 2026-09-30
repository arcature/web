import type { APIRoute } from 'astro';
import { getSite } from '../lib/content';

export const GET: APIRoute = async (context) => {
  const site = await getSite(context);
  const rule = site.hideFromSearchEngines ? 'Disallow: /' : 'Allow: /';

  return new Response(`User-agent: *\n${rule}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
