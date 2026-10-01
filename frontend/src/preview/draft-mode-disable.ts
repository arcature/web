import type { APIRoute } from 'astro';

import { DRAFT_MODE_COOKIE } from '../lib/sanity';

export const GET: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(DRAFT_MODE_COOKIE, { path: '/' });

  return redirect('/', 307);
};
