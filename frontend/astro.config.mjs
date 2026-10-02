// @ts-check
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';
import { loadEnv } from 'vite';

import { sanityRedirects } from './redirects.mjs';

// Production prerenders every page (published content, images downloaded into
// the build). The QA stage renders every page on request so Sanity's
// Presentation tool can show drafts, and adds the draft-mode routes.
const isPreview = process.env.SANITY_PREVIEW === 'true';

// The config doesn't see .env on its own; CI sets these in the environment.
const env = { ...loadEnv('', process.cwd(), 'PUBLIC_'), ...process.env };

/** @returns {import('astro').AstroIntegration} */
const sanityPreview = () => ({
  name: 'sanity-preview',
  hooks: {
    'astro:route:setup': ({ route }) => {
      route.prerender = false;
    },
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({
        pattern: '/api/draft-mode/enable',
        entrypoint: './src/preview/draft-mode-enable.ts',
        prerender: false,
      });
      injectRoute({
        pattern: '/api/draft-mode/disable',
        entrypoint: './src/preview/draft-mode-disable.ts',
        prerender: false,
      });
    },
  },
});

// https://astro.build/config
export default defineConfig({
  // Absolute URLs for canonical and social tags (see src/layouts/Seo.astro).
  // SITE_DOMAIN is set per stage in GitHub and is also the stage's CloudFront
  // domain. Requests reach the Lambda with its function URL as the host, so
  // the public URL has to come from here.
  site: process.env.SITE_DOMAIN
    ? `https://${process.env.SITE_DOMAIN}`
    : undefined,
  // Standalone so the Lambda wrapper (lambda/server/handler.mjs) can serve static files too.
  adapter: node({ mode: 'standalone' }),
  integrations: [
    // Both stages: src/middleware.ts answers the redirects kept in Sanity.
    sanityRedirects({
      projectId: env.PUBLIC_SANITY_PROJECT_ID ?? '',
      dataset: env.PUBLIC_SANITY_DATASET || 'production',
    }),
    ...(isPreview ? [sanityPreview()] : []),
  ],
  env: {
    schema: {
      PUBLIC_SANITY_PROJECT_ID: envField.string({
        context: 'client',
        access: 'public',
      }),
      PUBLIC_SANITY_DATASET: envField.string({
        context: 'client',
        access: 'public',
        default: 'production',
      }),
      PUBLIC_SANITY_STUDIO_URL: envField.string({
        context: 'client',
        access: 'public',
        default: 'https://arcature.sanity.studio',
      }),
      SANITY_API_READ_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
  image: {
    domains: ['cdn.sanity.io'],
  },
  vite: {
    plugins: [tailwindcss()],
    // Lets production builds drop preview-only code (see Layout.astro).
    define: { 'import.meta.env.SANITY_PREVIEW': JSON.stringify(isPreview) },
  },
});
