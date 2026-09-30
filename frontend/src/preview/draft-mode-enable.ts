import type { APIRoute } from 'astro';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import { SANITY_API_READ_TOKEN } from 'astro:env/server';
import { client, DRAFT_MODE_COOKIE, draftModeCookieValue } from '../lib/sanity';

// Presentation opens this with a short-lived secret, then loads the page it
// redirects to inside the Studio's iframe.
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const value = draftModeCookieValue();

  if (!value) {
    return new Response('Draft mode is not configured (missing SANITY_API_READ_TOKEN).', { status: 501 });
  }

  const { isValid, redirectTo = '/' } = await validatePreviewUrl(
    client.withConfig({ token: SANITY_API_READ_TOKEN }),
    request.url,
  );

  if (!isValid) {
    return new Response('Invalid preview secret', { status: 401 });
  }

  // The Studio is on another site, so the cookie has to be allowed in a cross-site iframe.
  cookies.set(DRAFT_MODE_COOKIE, value, { path: '/', httpOnly: true, secure: true, sameSite: 'none' });

  return redirect(redirectTo, 307);
};
