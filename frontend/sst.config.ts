/// <reference path="./.sst/platform/config.d.ts" />

// Both stages are the Astro Node entry point in a Lambda behind CloudFront,
// built by .github/workflows/deploy.yml before `sst deploy`:
//
// - production (production branch): `npm run build` prerenders every page, so
//   the Lambda mostly serves files and never needs Sanity at request time.
//   Paths without a file go through Astro: src/middleware.ts answers
//   redirects, and anything else gets the prerendered 404 page.
// - qa (main branch): `SANITY_PREVIEW=true npm run build` renders pages on
//   request, so Sanity's Presentation tool can show drafts.
export default $config({
  app(input) {
    return {
      name: 'maestro-web',
      home: 'aws',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: input?.stage === 'production',
      providers: { aws: { region: 'us-east-1' } },
    };
  },

  async run() {
    const isProduction = $app.stage === 'production';
    const router = new sst.aws.Router('Web', {
      domain: process.env.SITE_DOMAIN || undefined,
    });

    // Drafts are only ever shown on QA, so only QA can read them.
    const preview: Record<string, $util.Input<string>> = isProduction
      ? {}
      : {
          SANITY_PREVIEW: 'true',
          SANITY_API_READ_TOKEN: new sst.Secret('SanityReadToken').value,
        };

    // See lambda/server/handler.mjs for why dist/client is copied to lambda/client.
    new sst.aws.Function('Server', {
      handler: 'lambda/server/handler.handler',
      runtime: 'nodejs24.x', // Keep in step with .nvmrc
      memory: '1024 MB',
      timeout: '20 seconds',
      copyFiles: [{ from: 'dist/client', to: 'lambda/client' }],
      nodejs: { esbuild: { external: ['sharp'] } },
      environment: { ASTRO_NODE_AUTOSTART: 'disabled', ...preview },
      url: { router: { instance: router } },
    });

    return { url: router.url };
  },
});
