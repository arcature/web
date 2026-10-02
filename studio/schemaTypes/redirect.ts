import { TransferIcon } from '@sanity/icons/Transfer';
import {
  defineField,
  defineType,
  type SlugValidationContext,
  type SlugValue,
  type ValidationContext,
} from 'sanity';

// Ported from clio's studio/src/schemaTypes/documents/redirects.ts, without the
// locale rules or wildcards. frontend/src/middleware.ts answers them: in
// production from a list built at deploy time (frontend/redirects.mjs), on QA
// and in dev from Sanity on each request, drafts included.

const API_VERSION = '2026-09-01';

/**
 * A path as the redirects are matched: case-insensitive, without a trailing
 * slash, query string or fragment.
 */
const matchKey = (path: string) =>
  path
    .replace(/[?#].*$/, '')
    .replace(/(.)\/+$/, '$1')
    .toLowerCase();

/** The other redirects, excluding this document's draft and published copies. */
function otherRedirectIds(document: { _id: string } | undefined) {
  const id = document?._id.replace(/^drafts\./, '') ?? '';
  return { draft: `drafts.${id}`, published: id };
}

/** Unique ignoring case, since `/Old` and `/old` would be one rule. */
async function isUniqueSource(
  source: string,
  context: SlugValidationContext,
): Promise<boolean> {
  if (!context.document) return true;

  const count = await context
    .getClient({ apiVersion: API_VERSION })
    .fetch<number>(
      `count(*[
        _type == "redirect" &&
        !(_id in [$draft, $published]) &&
        lower(source.current) == $source
      ])`,
      { ...otherRedirectIds(context.document), source: source.toLowerCase() },
    );

  return count === 0;
}

function validateSource(source: SlugValue | undefined): string | true {
  const path = source?.current;

  if (!path) return 'Source URL is required';
  if (!path.startsWith('/')) {
    return 'Source URL must start with a slash (e.g. /old-path)';
  }
  if (path === '/') {
    return 'The home page cannot be redirected';
  }
  if (path.endsWith('/')) {
    return 'Source URL cannot end with a slash';
  }
  if (/[?#]/.test(path)) {
    return 'Source URL cannot include a query string or #fragment';
  }
  if (path.startsWith('/api/') || path.startsWith('/_')) {
    return 'Paths under /api/ and /_ are never redirected';
  }

  return true;
}

function validateDestination(
  destination: string | undefined,
  context: ValidationContext,
): string | true {
  if (!destination) return 'Destination URL is required';

  const isPath = destination.startsWith('/') && !destination.startsWith('//');
  if (!isPath) {
    try {
      const parsed = new URL(destination);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error();
      }
    } catch {
      return (
        'Destination URL must be a path starting with / or a full URL ' +
        'starting with http:// or https://'
      );
    }
  }

  const source = (context.document?.source as SlugValue | undefined)?.current;

  if (
    isPath &&
    source &&
    matchKey(destination) === matchKey(source) &&
    !destination.includes('?')
  ) {
    return 'Destination is the same as the source, which would redirect forever';
  }

  return true;
}

/**
 * Warns when the destination is itself redirected, which costs visitors and
 * crawlers an extra hop.
 */
async function warnOnChain(
  destination: string | undefined,
  context: ValidationContext,
): Promise<string | true> {
  if (!destination?.startsWith('/') || destination.startsWith('//')) {
    return true;
  }

  const next = await context
    .getClient({ apiVersion: API_VERSION })
    .fetch<{ destination?: string } | null>(
      `*[
        _type == "redirect" &&
        !(_id in path("drafts.**")) &&
        !(_id in [$draft, $published]) &&
        lower(source.current) == $source
      ][0]{ destination }`,
      {
        ...otherRedirectIds(context.document),
        source: matchKey(destination),
      },
    );

  return next
    ? `${destination} is itself redirected to ${next.destination ?? 'another URL'}. Point this redirect there directly.`
    : true;
}

export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  icon: TransferIcon,
  fields: [
    defineField({
      name: 'source',
      title: 'Source',
      type: 'slug',
      description:
        "The old path, starting with '/' (e.g. /old-page). Works on QA straight away, even unpublished; on the live site after it's published and deployed.",
      options: { isUnique: isUniqueSource },
      validation: (rule) => rule.required().custom(validateSource),
    }),
    defineField({
      name: 'destination',
      title: 'Destination',
      type: 'string',
      description: 'A path on this site (e.g. /new-page) or a full URL.',
      validation: (rule) => [
        rule.required().custom(validateDestination),
        rule.custom(warnOnChain).warning(),
      ],
    }),
    defineField({
      name: 'permanent',
      title: 'Permanent redirect',
      type: 'boolean',
      description: 'Permanent (301) or temporary (302).',
      initialValue: true,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'source.current', target: 'destination' },
    prepare: ({ title, target }) => ({
      title: title || 'Redirect',
      subtitle: `Redirects to ${target || 'another URL'}`,
    }),
  },
});
