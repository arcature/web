/// <reference path="./.sst/platform/config.d.ts" />

// Each stage is the Astro Node entry point in a Lambda, served through its own
// CloudFront distribution with the Lambda's function URL as the only origin.
// Every request, assets included, goes to the Lambda. Built by
// .github/workflows/deploy.yml before `sst deploy`:
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

    // Drafts are only ever shown on QA, so only QA can read them. The token is
    // the qa GitHub environment's SANITY_API_READ_TOKEN secret, passed to
    // `sst deploy` by .github/workflows/deploy.yml.
    const readToken = process.env.SANITY_API_READ_TOKEN;
    if (!isProduction && !readToken) {
      throw new Error(
        'SANITY_API_READ_TOKEN must be set to deploy QA (a Sanity Viewer token).',
      );
    }

    const preview: Record<string, string> = isProduction
      ? {}
      : { SANITY_PREVIEW: 'true', SANITY_API_READ_TOKEN: readToken! };

    // See lambda/server/handler.mjs for why dist/client is copied to lambda/client.
    const server = new sst.aws.Function('Server', {
      handler: 'lambda/server/handler.handler',
      runtime: 'nodejs24.x', // Keep in step with .nvmrc
      memory: '1024 MB',
      timeout: '20 seconds',
      copyFiles: [{ from: 'dist/client', to: 'lambda/client' }],
      nodejs: { esbuild: { external: ['sharp'] } },
      environment: { ASTRO_NODE_AUTOSTART: 'disabled', ...preview },
      url: true,
    });

    // Follows the Lambda's Cache-Control (nothing is cached without one), so
    // production's prerendered files and 301s can be cached and QA's no-store
    // responses never are. Query strings are part of the key; cookies aren't,
    // and only matter on QA, which never caches.
    const cachePolicy = new aws.cloudfront.CachePolicy('ServerCache', {
      minTtl: 0,
      defaultTtl: 0,
      maxTtl: 31536000,
      parametersInCacheKeyAndForwardedToOrigin: {
        cookiesConfig: { cookieBehavior: 'none' },
        headersConfig: { headerBehavior: 'none' },
        queryStringsConfig: { queryStringBehavior: 'all' },
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      },
    });

    const cdn = new sst.aws.Cdn('Web', {
      domain: process.env.SITE_DOMAIN || undefined,
      origins: [
        {
          originId: 'server',
          domainName: server.url.apply((url) => new URL(url).host),
          customOriginConfig: {
            httpPort: 80,
            httpsPort: 443,
            originProtocolPolicy: 'https-only',
            originSslProtocols: ['TLSv1.2'],
          },
        },
      ],
      defaultCacheBehavior: {
        targetOriginId: 'server',
        viewerProtocolPolicy: 'redirect-to-https',
        allowedMethods: [
          'DELETE',
          'GET',
          'HEAD',
          'OPTIONS',
          'PATCH',
          'POST',
          'PUT',
        ],
        cachedMethods: ['GET', 'HEAD'],
        compress: true,
        cachePolicyId: cachePolicy.id,
        // AWS managed AllViewerExceptHostHeader: cookies, query strings and
        // headers reach the Lambda; Host can't, as the function URL needs its own.
        originRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac',
      },
    });

    return { url: cdn.url, functionUrl: server.url };
  },
});
