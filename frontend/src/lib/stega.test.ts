import { describe, expect, it } from 'vitest';

import { frameAncestors, wantsStega } from './stega';

const request = (dest: string | null, path = '/') => {
  const headers = new Headers();
  if (dest) headers.set('Sec-Fetch-Dest', dest);
  return [headers, new URL(path, 'https://qa.example.test')] as const;
};

describe('wantsStega', () => {
  it('is on inside a frame (Presentation)', () => {
    expect(wantsStega(...request('iframe'))).toBe(true);
    expect(wantsStega(...request('iframe', '/404?utm=x'))).toBe(true);
  });

  it('is off for a page opened directly', () => {
    expect(wantsStega(...request('document'))).toBe(false);
  });

  it('is off without the header (older browsers, tools)', () => {
    expect(wantsStega(...request(null))).toBe(false);
  });

  it('is off in the Preview tab, which marks its URL', () => {
    expect(wantsStega(...request('iframe', '/?view=preview'))).toBe(false);
    expect(wantsStega(...request('iframe', '/?view=other'))).toBe(true);
  });
});

describe('frameAncestors', () => {
  it('allows the deployed Studio and the local one', () => {
    expect(frameAncestors('https://arcature.sanity.studio/some/path')).toBe(
      'frame-ancestors https://arcature.sanity.studio http://localhost:3333',
    );
  });

  it('falls back to the local Studio for a missing or invalid URL', () => {
    expect(frameAncestors('')).toBe('frame-ancestors http://localhost:3333');
    expect(frameAncestors('not a url')).toBe(
      'frame-ancestors http://localhost:3333',
    );
  });
});
