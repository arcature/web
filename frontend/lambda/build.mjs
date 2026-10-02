// Packages the Astro build for Lambda in .lambda/, which sst.config.ts deploys
// as is (`bundle`). Runs after `astro build` (see `npm run build`).
//
// SST's own bundling would flatten the handler into /var/task/bundle.mjs, but
// the Astro Node adapter finds the prerendered files by walking up from its
// own file to a folder named "server" and looking for "../client". So the
// layout here keeps that shape:
//
//   .lambda/index.mjs            entry point (index.handler)
//   .lambda/server/handler.mjs   lambda/server/handler.mjs, bundled
//   .lambda/client/              dist/client: prerendered pages and assets

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

import { build } from 'esbuild';

const out = new URL('../.lambda/', import.meta.url);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: [new URL('server/handler.mjs', import.meta.url).pathname],
  outfile: new URL('server/handler.mjs', out).pathname,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24', // Keep in step with .nvmrc and the runtime in sst.config.ts
  // Only Astro's image endpoint uses sharp, and nothing calls it in Lambda.
  external: ['sharp'],
  // Some dependencies are CommonJS and call require().
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'warning',
});

await cp(new URL('../dist/client/', import.meta.url), new URL('client/', out), {
  recursive: true,
});

await writeFile(
  new URL('index.mjs', out),
  "export { handler } from './server/handler.mjs';\n",
);

console.log('[lambda] Packaged .lambda/');
