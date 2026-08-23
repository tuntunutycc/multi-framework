const EMBED_MARKER = '/maps/embed?';

/** Official Google Maps iframe embed URL (Share → Embed a map). */
export function isGoogleMapsEmbedUrl(url: string): boolean {
  return url.includes(EMBED_MARKER);
}

/** Legacy embed format Google still serves for ?q=…&output=embed (no API key). */
export function buildGoogleMapsEmbedFromQuery(query: string, zoom = 16): string {
  const params = new URLSearchParams({
    q: query,
    z: String(zoom),
    output: 'embed',
  });
  return `https://www.google.com/maps?${params.toString()}`;
}

function decodePlaceSegment(segment: string): string {
  try {
    return decodeURIComponent(segment.replace(/\+/g, ' ')).trim();
  } catch {
    return segment.replace(/\+/g, ' ').trim();
  }
}

/** Extract lat/lng, place label, or search query from a resolved Google Maps URL. */
export function parseGoogleMapsUrl(url: string): {
  lat?: number;
  lng?: number;
  placeName?: string;
  query?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {};
  }

  const host = parsed.hostname.replace(/^www\./, '');
  if (!host.includes('google.') && !host.includes('goo.gl') && !host.includes('maps.app')) {
    return {};
  }

  const path = decodeURIComponent(parsed.pathname);

  const coordMatch = path.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (coordMatch) {
    const lat = Number(coordMatch[1]);
    const lng = Number(coordMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const placeMatch = path.match(/\/place\/([^/@]+)/);
      return {
        lat,
        lng,
        placeName: placeMatch ? decodePlaceSegment(placeMatch[1]) : undefined,
      };
    }
  }

  const placeMatch = path.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    return { placeName: decodePlaceSegment(placeMatch[1]) };
  }

  const q = parsed.searchParams.get('q') ?? parsed.searchParams.get('query');
  if (q?.trim()) {
    return { query: q.trim() };
  }

  const apiQuery = parsed.searchParams.get('query');
  if (apiQuery?.trim()) {
    return { query: apiQuery.trim() };
  }

  return {};
}

/** Convert share / place / search URLs into an iframe-safe Google Maps embed src. */
export function googleMapsEmbedFromUrl(url: string, fallbackAddress = ''): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  if (isGoogleMapsEmbedUrl(trimmed)) {
    return trimmed;
  }

  if (!/^https:\/\//i.test(trimmed)) {
    return undefined;
  }

  const parsed = parseGoogleMapsUrl(trimmed);

  if (parsed.lat !== undefined && parsed.lng !== undefined) {
    return buildGoogleMapsEmbedFromQuery(`${parsed.lat},${parsed.lng}`);
  }

  if (parsed.placeName) {
    return buildGoogleMapsEmbedFromQuery(parsed.placeName);
  }

  if (parsed.query) {
    return buildGoogleMapsEmbedFromQuery(parsed.query);
  }

  const address = fallbackAddress.trim();
  if (address) {
    return buildGoogleMapsEmbedFromQuery(address);
  }

  return undefined;
}

const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'maps.google.com']);

function isShortOrRedirectable(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return SHORT_LINK_HOSTS.has(host) || host.endsWith('.goo.gl');
  } catch {
    return false;
  }
}

/** Resolve short links server-side, then derive an embed URL. */
export async function resolveGoogleMapsEmbedUrl(
  url: string,
  fallbackAddress = '',
): Promise<string | undefined> {
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  const direct = googleMapsEmbedFromUrl(trimmed, fallbackAddress);
  if (direct) return direct;

  if (!isShortOrRedirectable(trimmed)) {
    return undefined;
  }

  try {
    const response = await fetch(trimmed, {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'text/html' },
    });
    const resolved = response.url?.trim();
    if (!resolved || resolved === trimmed) {
      return fallbackAddress.trim()
        ? buildGoogleMapsEmbedFromQuery(fallbackAddress.trim())
        : undefined;
    }
    return googleMapsEmbedFromUrl(resolved, fallbackAddress);
  } catch {
    return fallbackAddress.trim()
      ? buildGoogleMapsEmbedFromQuery(fallbackAddress.trim())
      : undefined;
  }
}
