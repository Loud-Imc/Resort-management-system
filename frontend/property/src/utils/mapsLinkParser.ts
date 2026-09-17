/**
 * Utility for extracting GPS coordinates from Google Maps URLs.
 *
 * Supports:
 *  - Standard long-form URLs: https://www.google.com/maps/place/...@lat,lng,...
 *  - Protobuf URLs: ...!3d{lat}!4d{lng}
 *  - Query-param URLs: ?q=lat,lng | ?ll=lat,lng
 *  - Path coords: /place/lat,lng
 *  - Short links: maps.app.goo.gl/... and goo.gl/maps/... (resolved via backend)
 */

export interface ParsedCoords {
    lat: number;
    lng: number;
}

export interface ParseResult {
    coords: ParsedCoords | null;
    /** true when we sent the link to the backend but it came back without coords */
    noCoordinatesFound?: boolean;
    /** true when we are waiting for the backend to resolve a short link */
    resolving?: boolean;
}

/**
 * Attempt to extract lat/lng directly from a URL string using regex patterns.
 * Returns null if no pattern matches.
 */
export function extractCoordsFromUrl(url: string): ParsedCoords | null {
    if (!url) return null;

    // Pattern 1: @lat,lng  (standard map view / directions)
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    // Pattern 2: !3dlat!4dlng  (protobuf / place pin)
    const protoMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (protoMatch) return { lat: parseFloat(protoMatch[1]), lng: parseFloat(protoMatch[2]) };

    // Pattern 3: ?q=lat,lng | ?ll=lat,lng | ?query=lat,lng | ?destination=lat,lng | ?center=lat,lng
    const queryMatch = url.match(/[?&](?:q|ll|query|destination|center)=(-?\d+\.\d+),(-?\d+\.\d+)/i);
    if (queryMatch) return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) };

    // Pattern 4: /place/lat,lng in path
    const placeMatch = url.match(/\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/i);
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

    return null;
}

/**
 * Returns true if the URL looks like a Google Maps short link that requires
 * backend resolution.
 */
export function isShortOrExpandableMapLink(url: string): boolean {
    return (
        url.includes('goo.gl') ||
        url.includes('maps.app.goo.gl') ||
        url.includes('google.com/maps') ||
        url.includes('maps.google')
    );
}

/**
 * Full parse pipeline (client-side only — no network).
 * Call this first; if it returns null, check isShortOrExpandableMapLink and
 * call expandAndParse via the service layer.
 */
export function parseMapUrl(url: string): ParsedCoords | null {
    if (!url || !url.trim()) return null;
    return extractCoordsFromUrl(url.trim());
}
