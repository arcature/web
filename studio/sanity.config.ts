import { CogIcon } from '@sanity/icons/Cog';
import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { type StructureBuilder, structureTool } from 'sanity/structure';
import { webhooksTrigger } from 'sanity-plugin-webhooks-trigger';

import { schemaTypes, singletonTypes } from './schemaTypes';

// Encrypts the auth tokens the Deploy tool stores with each webhook. Changing
// it makes saved tokens unreadable, so they'd have to be entered again.
const webhooksEncryptionSalt =
  process.env.SANITY_STUDIO_PLUGIN_WEBHOOKS_ENCRYPTION_SALT || undefined;

// A singleton's ID is its type name.
const singleton = (S: StructureBuilder, type: string) =>
  S.documentTypeListItem(type).child(
    S.document().schemaType(type).documentId(type),
  );

const homeLocation = { title: 'Home page', href: '/' };
const notFoundLocation = { title: '404 page', href: '/404' };
// Settings and navigation appear on every page.
const everyPage = { locations: [homeLocation, notFoundLocation] };

export default defineConfig({
  name: 'default',
  title: 'Maestro',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    structureTool({
      // As in FK Kit: the pages, then everything site-wide in a Site settings folder.
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            singleton(S, 'homePage'),
            S.divider(),
            S.listItem()
              .title('Site settings')
              .icon(CogIcon)
              .child(
                S.list()
                  .title('Site settings')
                  .items([
                    singleton(S, 'siteSettings'),
                    singleton(S, 'mainNavigation'),
                    singleton(S, 'footerNavigation'),
                    singleton(S, 'notFoundPage'),
                    S.documentTypeListItem('redirect').title('Redirects'),
                  ]),
              ),
          ]),
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
        locations: {
          homePage: { locations: [homeLocation] },
          notFoundPage: { locations: [notFoundLocation] },
          siteSettings: everyPage,
          mainNavigation: everyPage,
          footerNavigation: everyPage,
        },
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
