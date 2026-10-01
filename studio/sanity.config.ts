import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';
import { webhooksTrigger } from 'sanity-plugin-webhooks-trigger';

import { schemaTypes, singletons } from './schemaTypes';

const singletonTypes = new Set<string>(
  singletons.map((singleton) => singleton.type),
);

// Encrypts the auth tokens the Deploy tool stores with each webhook. Changing
// it makes saved tokens unreadable, so they'd have to be entered again.
const webhooksEncryptionSalt =
  process.env.SANITY_STUDIO_PLUGIN_WEBHOOKS_ENCRYPTION_SALT || undefined;

// Every document on this site is shown on the home page.
const onHomePage = { locations: [{ title: 'Home page', href: '/' }] };

export default defineConfig({
  name: 'default',
  title: 'Maestro',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items(
            singletons.map(({ type, id, title }) =>
              S.listItem()
                .title(title)
                .id(id)
                .child(S.document().schemaType(type).documentId(id)),
            ),
          ),
    }),
    presentationTool({
      previewUrl: {
        origin:
          process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:4321',
        previewMode: {
          enable: '/api/draft-mode/enable',
          disable: '/api/draft-mode/disable',
        },
      },
      resolve: {
        locations: { homePage: onHomePage, siteSettings: onHomePage },
      },
    }),
    webhooksTrigger({
      title: 'Deploy',
      pageTitle: 'Trigger Deploys',
      text: 'By clicking the appropriate button below, you can trigger a deploy of the latest content to the desired environment.',
      encryptionSalt: webhooksEncryptionSalt,
      // The event .github/workflows/production.yml listens for.
      githubEventType: 'sanity-publish',
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    // Singletons can't be created from the "new document" menu.
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },

  document: {
    // ...or duplicated or deleted.
    actions: (actions, { schemaType }) =>
      singletonTypes.has(schemaType)
        ? actions.filter(
            ({ action }) =>
              action &&
              ['publish', 'discardChanges', 'restore'].includes(action),
          )
        : actions,
  },
});
