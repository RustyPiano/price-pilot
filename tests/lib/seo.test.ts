import { describe, expect, it } from 'vitest';
import { buildAbsoluteUrl, buildLlmsText, normalizeSiteOrigin } from '@/lib/seo';

describe('seo helpers', () => {
  it('normalizes valid site origins', () => {
    expect(normalizeSiteOrigin('https://price-pilot.example.com/path')).toBe('https://price-pilot.example.com');
  });

  it('returns null for invalid origins', () => {
    expect(normalizeSiteOrigin('not-a-url')).toBeNull();
  });

  it('builds absolute urls when an origin exists', () => {
    expect(buildAbsoluteUrl('https://price-pilot.example.com', '/en')).toBe('https://price-pilot.example.com/en');
  });

  it('falls back to a path when no origin exists', () => {
    expect(buildAbsoluteUrl(null, '/en')).toBe('/en');
  });

  it('includes both localized landing pages in llms text', () => {
    const content = buildLlmsText('https://price-pilot.example.com');

    expect(content).toContain('https://price-pilot.example.com/');
    expect(content).toContain('https://price-pilot.example.com/en');
  });
});
