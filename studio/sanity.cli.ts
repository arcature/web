import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // Deployed to https://maestro.sanity.studio by `npm run deploy`.
  studioHost: 'maestro',
  typegen: {
    path: '../src/**/*.ts',
    schema: '../schema.json',
    generates: '../src/sanity.types.ts',
  },
});
