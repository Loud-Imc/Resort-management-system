/**
 * SemVer Comparator Utility
 * Compares two semantic version strings (e.g. '2.4.0' vs '2.10.0', '1.0.0-beta.1' vs '1.0.0').
 *
 * @returns -1 if v1 < v2
 *           0 if v1 == v2
 *           1 if v1 > v2
 */
export function compareSemver(v1: string | null | undefined, v2: string | null | undefined): number {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;

  // Clean version string: remove 'v' prefix, build tags, and prereleases for numeric comparison
  const parseParts = (v: string): number[] => {
    const clean = v.trim().replace(/^v/i, '').split('-')[0].split('+')[0];
    const segments = clean.split('.').map((p) => {
      const parsed = parseInt(p, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });
    // Ensure at least 3 parts [major, minor, patch]
    while (segments.length < 3) {
      segments.push(0);
    }
    return segments;
  };

  const p1 = parseParts(v1);
  const p2 = parseParts(v2);

  const length = Math.max(p1.length, p2.length);
  for (let i = 0; i < length; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }

  return 0;
}
