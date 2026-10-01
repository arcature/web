/// <reference path="./.sst/platform/config.d.ts" />

// Two stages, both built by .github/workflows/deploy.yml before `sst deploy`:
//
// - production (production branch): `npm run build` prerenders every page, so
//   the site is plain files in S3 behind CloudFront, with no server.
// - qa (main branch): `SANITY_PREVIEW=true npm run build` renders pages on
//   request in a Lambda, so Sanity's Presentation tool can show drafts.
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
    const domain = process.env.SITE_DOMAIN || undefined;
    const router = new sst.aws.Router('Web', { domain });

    if ($app.stage === 'production') {
      new sst.aws.StaticSite('Site', {
        path: 'dist/client',
        router: { instance: router },
        assets: {
          fileOptions: [
            {
              files: '_astro/**',
              cacheControl: 'public, max-age=31536000, immutable',
            },
            {
              files: ['**', '!_astro/**'],
              cacheControl: 'public, max-age=0, must-revalidate',
            },
          ],
        },
      });
    } else {
      const readToken = new sst.Secret('SanityReadToken');

      // See lambda/server/handler.mjs for why dist/client is copied to lambda/client.
      new sst.aws.Function('Server', {
        handler: 'lambda/server/handler.handler',
        runtime: 'nodejs24.x', // Keep in step with .nvmrc
        memory: '1024 MB',
        timeout: '20 seconds',
        copyFiles: [{ from: 'dist/client', to: 'lambda/client' }],
        nodejs: { esbuild: { external: ['sharp'] } },
        environment: {
          ASTRO_NODE_AUTOSTART: 'disabled',
          SANITY_API_READ_TOKEN: readToken.value,
        },
        url: { router: { instance: router } },
      });
    }

    return { url: router.url };
  },
});
