/**
 * Utility for extracting GPS coordinates from Google Maps URLs.
 * (Admin portal copy — mirrors frontend/property/src/utils/mapsLinkParser.ts)
 */

export interface ParsedCoords {
    lat: number;
    lng: number;
}

export function extractCoordsFromUrl(url: string): ParsedCoords | null {
    if (!url) return null;

    const protoMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (protoMatch) return { lat: parseFloat(protoMatch[1]), lng: parseFloat(protoMatch[2]) };

    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    const queryMatch = url.match(/[?&](?:q|ll|query|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/i);
    if (queryMatch) return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) };

    const placeMatch = url.match(/\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/i);
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

    return null;
}

export function isShortOrExpandableMapLink(url: string): boolean {
    return (
        url.includes('goo.gl') ||
        url.includes('maps.app.goo.gl') ||
        url.includes('google.com/maps') ||
        url.includes('maps.google')
    );
}

export function parseMapUrl(url: string): ParsedCoords | null {
    if (!url || !url.trim()) return null;
    return extractCoordsFromUrl(url.trim());
}
