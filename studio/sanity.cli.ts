import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // Deployed to https://arcature.sanity.studio by `npm run deploy`.
  studioHost: 'arcature',
  deployment: {
    appId: 'mmb07fuq45xo7nf7m12obkqt',
  },
  typegen: {
    path: '../frontend/src/**/*.ts',
    schema: 'schema.json',
    generates: '../frontend/src/sanity.types.ts',
  },
});
