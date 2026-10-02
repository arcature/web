import { describe, expect, it } from 'vitest';

import { cleanUsername, socialLinks, twitterUsername } from './social';

describe('socialLinks', () => {
  it('builds each platform’s profile URL and label, in order', () => {
    expect(
      socialLinks([
        { platform: 'linkedin', username: 'arcature' },
        { platform: 'twitter', username: 'arcature_io' },
        { platform: 'instagram', username: 'arcature' },
        { platform: 'facebook', username: 'arcature' },
        { platform: 'youtube', username: 'arcature' },
      ]),
    ).toEqual([
      {
        platform: 'linkedin',
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/company/arcature/',
      },
      { platform: 'twitter', label: 'X', href: 'https://x.com/arcature_io' },
      {
        platform: 'instagram',
        label: 'Instagram',
        href: 'https://www.instagram.com/arcature/',
      },
      {
        platform: 'facebook',
        label: 'Facebook',
        href: 'https://www.facebook.com/arcature',
      },
      {
        platform: 'youtube',
        label: 'YouTube',
        href: 'https://www.youtube.com/@arcature',
      },
    ]);
  });

  it('strips a leading @ and whitespace from usernames', () => {
    expect(
      socialLinks([{ platform: 'twitter', username: ' @arcature ' }]),
    ).toEqual([
      { platform: 'twitter', label: 'X', href: 'https://x.com/arcature' },
    ]);
  });

  it('encodes usernames in the URL', () => {
    expect(
      socialLinks([{ platform: 'instagram', username: 'a b/c' }])[0].href,
    ).toBe('https://www.instagram.com/a%20b%2Fc/');
  });

  it('skips profiles without a username or a known platform', () => {
    expect(
      socialLinks([
        { platform: 'linkedin', username: null },
        { platform: 'linkedin', username: '  ' },
        { platform: null, username: 'arcature' },
        { platform: 'myspace', username: 'arcature' },
        { platform: 'toString', username: 'arcature' },
      ]),
    ).toEqual([]);
  });
});

describe('twitterUsername', () => {
  it('returns the X profile’s username without the @', () => {
    expect(
      twitterUsername([
        { platform: 'linkedin', username: 'arcature' },
        { platform: 'twitter', username: '@arcature_io' },
      ]),
    ).toBe('arcature_io');
  });

  it('is undefined without an X profile', () => {
    expect(
      twitterUsername([{ platform: 'linkedin', username: 'arcature' }]),
    ).toBeUndefined();
  });
});

describe('cleanUsername', () => {
  it('is undefined for empty values', () => {
    expect(cleanUsername(undefined)).toBeUndefined();
    expect(cleanUsername(null)).toBeUndefined();
    expect(cleanUsername(' @ ')).toBeUndefined();
  });
});
