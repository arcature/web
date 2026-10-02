import { describe, expect, it } from 'vitest';

import {
  documentPath,
  documentRoutes,
  pageTypes,
  publishedId,
  type RouteRules,
  siteRoutes,
} from '../../../shared/routes';

// The site has no slugged page types yet, so these exercise the rules with some.
const rules: RouteRules = {
  fixedPages: [
    { id: 'homePage', title: 'Home page', path: '/' },
    { id: 'notFoundPage', title: '404 page', path: '/404' },
  ],
  slugRoutes: { page: '', post: 'blog', caseStudy: 'work/case-studies' },
};

describe('publishedId', () => {
  it('strips draft and release version prefixes', () => {
    expect(publishedId('drafts.homePage')).toBe('homePage');
    expect(publishedId('versions.rABC123.homePage')).toBe('homePage');
    expect(publishedId('homePage')).toBe('homePage');
    expect(publishedId(undefined)).toBe('');
  });
});

describe('documentPath', () => {
  it('pins fixed pages by ID, including drafts and versions', () => {
    expect(documentPath({ _id: 'homePage', _type: 'homePage' }, rules)).toBe(
      '/',
    );
    expect(
      documentPath(
        { _id: 'drafts.notFoundPage', _type: 'notFoundPage' },
        rules,
      ),
    ).toBe('/404');
    expect(
      documentPath({ _id: 'versions.r1.homePage', _type: 'homePage' }, rules),
    ).toBe('/');
  });

  it('builds slugged paths under their base, or at the root', () => {
    expect(
      documentPath({ _id: 'a', _type: 'post', slug: { current: 'hi' } }, rules),
    ).toBe('/blog/hi');
    expect(
      documentPath({ _id: 'b', _type: 'page', slug: 'about' }, rules),
    ).toBe('/about');
    expect(
      documentPath(
        { _id: 'c', _type: 'caseStudy', slug: { current: 'acme' } },
        rules,
      ),
    ).toBe('/work/case-studies/acme');
  });

  it('is null for documents without a page', () => {
    expect(documentPath(null, rules)).toBeNull();
    expect(
      documentPath({ _id: 'siteSettings', _type: 'siteSettings' }, rules),
    ).toBeNull();
    expect(documentPath({ _id: 'd', _type: 'post' }, rules)).toBeNull();
    expect(
      documentPath({ _id: 'e', _type: 'post', slug: { current: '' } }, rules),
    ).toBeNull();
  });
});

describe('documentRoutes', () => {
  it('puts fixed pages first, then slugged types longest base first, root last', () => {
    expect(documentRoutes(rules)).toEqual([
      { route: '/', filter: '_id == "homePage"' },
      { route: '/404', filter: '_id == "notFoundPage"' },
      {
        route: '/work/case-studies/:slug',
        filter: '_type == "caseStudy" && slug.current == $slug',
      },
      {
        route: '/blog/:slug',
        filter: '_type == "post" && slug.current == $slug',
      },
      { route: '/:slug', filter: '_type == "page" && slug.current == $slug' },
    ]);
  });
});

describe('pageTypes', () => {
  it('lists fixed pages and slugged types', () => {
    expect(pageTypes(rules)).toEqual([
      'homePage',
      'notFoundPage',
      'page',
      'post',
      'caseStudy',
    ]);
  });
});

describe('the site’s routes', () => {
  it('match the fixed pages the frontend serves', () => {
    expect(documentRoutes(siteRoutes).map((r) => r.route)).toEqual([
      '/',
      '/404',
    ]);
  });
});
