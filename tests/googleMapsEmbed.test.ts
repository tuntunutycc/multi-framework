import { describe, expect, it } from 'vitest';
import {
  buildGoogleMapsEmbedFromQuery,
  googleMapsEmbedFromUrl,
  isGoogleMapsEmbedUrl,
  parseGoogleMapsUrl,
} from '@/lib/maps/googleMapsEmbed';

describe('googleMapsEmbed', () => {
  it('passes through official embed URLs', () => {
    const url = 'https://www.google.com/maps/embed?pb=!1m18!1m12';
    expect(isGoogleMapsEmbedUrl(url)).toBe(true);
    expect(googleMapsEmbedFromUrl(url)).toBe(url);
  });

  it('converts place URLs with coordinates', () => {
    const url =
      'https://www.google.com/maps/place/Riverside+School/@34.0522,-118.2437,17z/data=!3m1!4b1';
    const parsed = parseGoogleMapsUrl(url);
    expect(parsed.lat).toBe(34.0522);
    expect(parsed.lng).toBe(-118.2437);
    expect(googleMapsEmbedFromUrl(url)).toBe(
      buildGoogleMapsEmbedFromQuery('34.0522,-118.2437'),
    );
  });

  it('converts place URLs without coordinates using place name', () => {
    const url = 'https://www.google.com/maps/place/Acme+Business+Center';
    expect(googleMapsEmbedFromUrl(url)).toBe(
      buildGoogleMapsEmbedFromQuery('Acme Business Center'),
    );
  });

  it('falls back to address when share URL cannot be parsed', () => {
    const url = 'https://maps.app.goo.gl/abc123';
    expect(googleMapsEmbedFromUrl(url, '1200 River Road')).toBe(
      buildGoogleMapsEmbedFromQuery('1200 River Road'),
    );
  });
});
