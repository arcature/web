import type {
  DefaultDocumentNodeResolver,
  StructureBuilder,
} from 'sanity/structure';

import { previewableTypes } from '../presentation/previewPath';
import { PreviewView } from './PreviewView';

/**
 * The form plus a Preview tab. Editors split the pane from the tab's menu to
 * keep the preview beside the form; it isn't split by default, because most
 * edits don't need it and it halves the form's width.
 */
export const previewViews = (S: StructureBuilder) => [
  S.view.form(),
  S.view.component(PreviewView).id('preview').title('Preview'),
];

/** The document pane for a type: with a Preview tab when it has a page. */
export const documentNode = (S: StructureBuilder, type: string) =>
  previewableTypes.has(type)
    ? S.document().views(previewViews(S))
    : S.document();

/**
 * Applies wherever the Studio builds a document pane on its own: type lists,
 * search, references, intents. Singletons pinned in the structure build their
 * own panes with `documentNode`.
 */
export const defaultDocumentNode: DefaultDocumentNodeResolver = (
  S,
  { schemaType },
) => documentNode(S, schemaType);
