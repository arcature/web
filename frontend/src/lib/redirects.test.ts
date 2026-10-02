import { describe, expect, it } from 'vitest';

import {
  compileRedirects,
  findRedirect,
  matchKey,
  type Redirect,
  redirectResponse,
  redirectTable,
} from './redirects';

const rule = (
  source: string | null,
  destination: string | null,
  permanent: boolean | null = true,
) => ({ source, destination, permanent });

describe('matchKey', () => {
  it('ignores case and trailing slashes', () => {
    expect(matchKey('/Old-Page/')).toBe('/old-page');
    expect(matchKey('/old//')).toBe('/old');
  });

  it('keeps the root path', () => {
    expect(matchKey('/')).toBe('/');
  });
});

describe('compileRedirects', () => {
  it('keeps valid rules, with 301 for permanent and 302 for temporary', () => {
    const { redirects, skipped } = compileRedirects([
      rule('/old', '/new'),
      rule('/temp', 'https://example.com/x', false),
      rule('/unset', '/new', null),
    ]);

    expect(skipped).toEqual([]);
    expect(redirects).toEqual([
      { source: '/old', destination: '/new', status: 301 },
      { source: '/temp', destination: 'https://example.com/x', status: 302 },
      { source: '/unset', destination: '/new', status: 301 },
    ]);
  });

  it.each([
    ['a missing source', rule(null, '/new')],
    ['a relative source', rule('old', '/new')],
    ['the home page', rule('/', '/new')],
    ['a source with a query string', rule('/old?x=1', '/new')],
    ['a source with a fragment', rule('/old#top', '/new')],
    ['an /api/ source', rule('/api/thing', '/new')],
    ['a /_ source', rule('/_astro/x.js', '/new')],
    ['a missing destination', rule('/old', null)],
    ['a protocol-relative destination', rule('/old', '//evil.example')],
    ['a non-http destination', rule('/old', 'javascript:alert(1)')],
    ['a destination equal to the source', rule('/old', '/OLD/')],
    ['a self-redirect with only a fragment', rule('/old', '/old#top')],
  ])('skips %s', (_, input) => {
    const { redirects, skipped } = compileRedirects([input]);

    expect(redirects).toEqual([]);
    expect(skipped).toHaveLength(1);
  });

  it('allows a destination that only adds a query string to the source', () => {
    const { redirects } = compileRedirects([rule('/old', '/old?ref=x')]);

    expect(redirects).toHaveLength(1);
  });

  it('keeps the first of two rules for the same source, ignoring case', () => {
    const { redirects, skipped } = compileRedirects([
      rule('/old', '/first'),
      rule('/OLD/', '/second'),
    ]);

    expect(redirects.map((r) => r.destination)).toEqual(['/first']);
    expect(skipped).toEqual(['/OLD/: duplicate source']);
  });
});

describe('findRedirect', () => {
  const table = redirectTable([
    { source: '/old', destination: '/new', status: 301 },
    { source: '/über', destination: '/uber', status: 301 },
  ]);

  it('matches ignoring case and a trailing slash', () => {
    expect(findRedirect(table, '/Old/')?.destination).toBe('/new');
  });

  it('matches percent-encoded paths', () => {
    expect(findRedirect(table, '/%C3%BCber')?.destination).toBe('/uber');
  });

  it('tolerates malformed escapes', () => {
    expect(findRedirect(table, '/%E0%A4%A')).toBeUndefined();
  });

  it('returns nothing for other paths', () => {
    expect(findRedirect(table, '/new')).toBeUndefined();
    expect(findRedirect(table, '/old/child')).toBeUndefined();
  });
});

describe('redirectResponse', () => {
  const permanent: Redirect = {
    source: '/old',
    destination: '/new',
    status: 301,
  };
  const url = (path: string) => new URL(path, 'https://example.test');

  it('sends a relative Location for same-site destinations', () => {
    const response = redirectResponse(permanent, url('/old'), true);

    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('/new');
  });

  it('sends an absolute Location for other sites', () => {
    const response = redirectResponse(
      { ...permanent, destination: 'https://other.example/x' },
      url('/old'),
      true,
    );

    expect(response.headers.get('Location')).toBe('https://other.example/x');
  });

  it('carries the query string over, unless the destination sets the parameter', () => {
    const response = redirectResponse(
      { ...permanent, destination: '/new?ref=a#top' },
      url('/old?utm=x&ref=b'),
      true,
    );

    expect(response.headers.get('Location')).toBe('/new?ref=a&utm=x#top');
  });

  it('lets a permanent redirect be cached only when cacheable', () => {
    expect(
      redirectResponse(permanent, url('/old'), true).headers.get(
        'Cache-Control',
      ),
    ).toBe('public, max-age=3600');
    expect(
      redirectResponse(permanent, url('/old'), false).headers.get(
        'Cache-Control',
      ),
    ).toBe('no-store');
  });

  it('never caches a temporary redirect', () => {
    const response = redirectResponse(
      { ...permanent, status: 302 },
      url('/old'),
      true,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
