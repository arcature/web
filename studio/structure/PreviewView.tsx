import { ComposeIcon } from '@sanity/icons/Compose';
import { DesktopIcon } from '@sanity/icons/Desktop';
import { LaunchIcon } from '@sanity/icons/Launch';
import { MobileDeviceIcon } from '@sanity/icons/MobileDevice';
import { RefreshIcon } from '@sanity/icons/Refresh';
import { Box, Button, Card, Flex, Spinner, Text } from '@sanity/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntentLink } from 'sanity/router';
import type { UserViewComponent } from 'sanity/structure';

import { PREVIEW_TAB_PARAM, PREVIEW_TAB_VALUE } from '../../shared/preview';
import type { DocumentPathRef } from '../../shared/routes';
import { previewPath } from '../presentation/previewPath';
import { previewUrl } from '../presentation/previewUrl';

/**
 * How long editing has to pause before the preview reloads. Every keystroke
 * saves a new revision, and reloading on each would leave the frame blank for
 * as long as anyone types.
 */
const RELOAD_DELAY_MS = 1500;

/** The width Presentation uses for its mobile viewport. */
const MOBILE_WIDTH = 375;

type Viewport = 'desktop' | 'mobile';

/**
 * The page's URL, marked as the Preview tab so QA renders it without stega:
 * nothing here is click-to-edit, and stega shifts text with letter spacing.
 */
function previewSrc(path: string) {
  const url = new URL(path, previewUrl);
  url.searchParams.set(PREVIEW_TAB_PARAM, PREVIEW_TAB_VALUE);
  return url.toString();
}

/**
 * The Preview tab on a document: the page it's shown on, from the QA site
 * (which always renders drafts) or local dev. Unlike Presentation it has no
 * live connection to the page, so it reloads once an edit has settled.
 *
 * Split the document pane from the tab's menu to keep it beside the form.
 */
export const PreviewView: UserViewComponent = ({
  document,
  documentId,
  schemaType,
}) => {
  const { displayed } = document;
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [loading, setLoading] = useState(true);
  const frame = useRef<HTMLIFrameElement>(null);

  const path = previewPath(displayed as DocumentPathRef);
  const src = typeof path === 'string' ? previewSrc(path) : undefined;

  useEffect(() => {
    if (src) {
      setLoading(true);
    }
  }, [src]);

  const reload = useCallback(() => {
    if (frame.current && src) {
      setLoading(true);
      // Assigning `src`, even the same value, navigates the frame. Its own
      // location can't be reloaded across origins.
      frame.current.src = src;
    }
  }, [src]);

  const rev = displayed._rev;
  const lastRev = useRef(rev);
  useEffect(() => {
    if (!rev || rev === lastRev.current) {
      return;
    }
    lastRev.current = rev;
    const timer = setTimeout(reload, RELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rev, reload]);

  const presentationLink = useIntentLink({
    intent: 'edit',
    params: {
      id: documentId,
      type: schemaType.name,
      mode: 'presentation',
      ...(typeof path === 'string' && { preview: path }),
    },
  });

  if (path instanceof Error) {
    return (
      <Card padding={5} height="fill">
        <Text muted size={1}>
          {path.message}
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" height="fill">
      <Card borderBottom paddingX={2} paddingY={1}>
        <Flex align="center" gap={1}>
          <Box flex={1} paddingX={2}>
            <Text muted size={1} textOverflow="ellipsis">
              {path}
            </Text>
          </Box>
          <Button
            aria-label="Desktop viewport"
            icon={DesktopIcon}
            mode="bleed"
            onClick={() => setViewport('desktop')}
            selected={viewport === 'desktop'}
            title="Desktop"
          />
          <Button
            aria-label="Mobile viewport"
            icon={MobileDeviceIcon}
            mode="bleed"
            onClick={() => setViewport('mobile')}
            selected={viewport === 'mobile'}
            title="Mobile"
          />
          <Button
            aria-label="Reload preview"
            icon={RefreshIcon}
            mode="bleed"
            onClick={reload}
            title="Reload"
          />
          <Button
            aria-label="Open preview in a new tab"
            as="a"
            href={src}
            icon={LaunchIcon}
            mode="bleed"
            rel="noopener noreferrer"
            target="_blank"
            title="Open in a new tab"
          />
          <Button
            aria-label="Open in Presentation"
            as="a"
            href={presentationLink.href}
            icon={ComposeIcon}
            mode="bleed"
            onClick={presentationLink.onClick}
            title="Open in Presentation"
          />
        </Flex>
      </Card>

      <Card flex={1} style={{ position: 'relative' }} tone="transparent">
        <Flex height="fill" justify="center">
          <iframe
            onLoad={() => setLoading(false)}
            ref={frame}
            src={src}
            style={{
              border: 0,
              display: 'block',
              height: '100%',
              width: viewport === 'mobile' ? MOBILE_WIDTH : '100%',
            }}
            title="Preview"
          />
        </Flex>
        {loading && (
          <Flex
            align="center"
            justify="center"
            style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }}
          >
            <Spinner muted />
          </Flex>
        )}
      </Card>
    </Flex>
  );
};
