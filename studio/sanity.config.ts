import { CogIcon } from '@sanity/icons/Cog';
import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { type StructureBuilder, structureTool } from 'sanity/structure';
import { webhooksTrigger } from 'sanity-plugin-webhooks-trigger';

import { previewUrl } from './presentation/previewUrl';
import { resolve } from './presentation/resolve';
import { schemaTypes, singletonTypes } from './schemaTypes';
import { defaultDocumentNode, documentNode } from './structure/documentViews';

// Encrypts the auth tokens the Deploy tool stores with each webhook. Changing
// it makes saved tokens unreadable, so they'd have to be entered again.
const webhooksEncryptionSalt =
  process.env.SANITY_STUDIO_PLUGIN_WEBHOOKS_ENCRYPTION_SALT || undefined;

// A singleton's ID is its type name.
const singleton = (S: StructureBuilder, type: string) =>
  S.documentTypeListItem(type).child(
    documentNode(S, type).schemaType(type).documentId(type),
  );

export default defineConfig({
  name: 'default',
  title: 'Maestro',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    structureTool({
      defaultDocumentNode,
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
      // QA always shows drafts, so Presentation just loads it; there's no
      // draft mode to switch on.
      previewUrl: { origin: previewUrl },
      // Generated from shared/routes.ts: which document a URL shows, and
      // where each document is used.
      resolve,
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
