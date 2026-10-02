/// <reference path="./.sst/platform/config.d.ts" />

// Each stage is the Astro Node entry point in a Lambda, served through its own
// CloudFront distribution with the Lambda's function URL as the only origin.
// Every request, assets included, goes to the Lambda. The function URL only
// accepts requests CloudFront has signed (origin access control), so it can't
// be called directly. Built by
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

    // The stage's domain, with DNS managed outside AWS: SITE_DOMAIN and an ACM
    // certificate for it in us-east-1 (SITE_CERT_ARN), both GitHub environment
    // variables. Set here rather than in the console, which the next deploy
    // would undo. Without them the stage uses its *.cloudfront.net address.
    const siteDomain = process.env.SITE_DOMAIN || undefined;
    const siteCert = process.env.SITE_CERT_ARN || undefined;
    if (Boolean(siteDomain) !== Boolean(siteCert)) {
      throw new Error(
        'Set both SITE_DOMAIN and SITE_CERT_ARN for a custom domain, or neither.',
      );
    }

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
      // IAM auth: only signed requests get in (see the OAC below).
      url: { authorization: 'iam' },
    });

    // CloudFront signs every request to the function URL with SigV4. POST/PUT
    // bodies then need an x-amz-content-sha256 header from the browser;
    // nothing on the site posts today.
    const originAccess = new aws.cloudfront.OriginAccessControl('ServerOac', {
      description: `Signs CloudFront requests to the ${$app.stage} function URL`,
      originAccessControlOriginType: 'lambda',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
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

    // An existing CloudFront Function to run on viewer requests, by ARN (the
    // VIEWER_REQUEST_FUNCTION_ARN GitHub environment variable, set on qa only).
    // The association is part of the distribution, so every deploy keeps it;
    // the function itself isn't declared here, so SST never changes or
    // deletes it. It must be published (LIVE) to be attached.
    const viewerRequestFunction =
      process.env.VIEWER_REQUEST_FUNCTION_ARN || undefined;

    const cdn = new sst.aws.Cdn('Web', {
      domain:
        siteDomain && siteCert
          ? { name: siteDomain, dns: false, cert: siteCert }
          : undefined,
      origins: [
        {
          originId: 'server',
          domainName: server.url.apply((url) => new URL(url).host),
          originAccessControlId: originAccess.id,
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
        functionAssociations: viewerRequestFunction
          ? [
              {
                eventType: 'viewer-request',
                functionArn: viewerRequestFunction,
              },
            ]
          : [],
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

    // Only this stage's distribution may invoke the function, and only through
    // its URL. AWS requires both permissions for OAC with a function URL.
    const distributionArn = cdn.nodes.distribution.arn;
    new aws.lambda.Permission('ServerUrlFromCdn', {
      function: server.name,
      action: 'lambda:InvokeFunctionUrl',
      functionUrlAuthType: 'AWS_IAM',
      principal: 'cloudfront.amazonaws.com',
      sourceArn: distributionArn,
    });
    new aws.lambda.Permission('ServerInvokeFromCdn', {
      function: server.name,
      action: 'lambda:InvokeFunction',
      invokedViaFunctionUrl: true,
      principal: 'cloudfront.amazonaws.com',
      sourceArn: distributionArn,
    });

    return { url: cdn.url };
  },
});
