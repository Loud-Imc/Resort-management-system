import { compareSemver } from './semver-comparator';

describe('compareSemver', () => {
  it('should correctly compare standard versions', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
    expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
  });

  it('should correctly compare multi-digit patch/minor versions (numerical comparison)', () => {
    // 2.10.0 is greater than 2.9.0
    expect(compareSemver('2.10.0', '2.9.0')).toBe(1);
    expect(compareSemver('2.9.0', '2.10.0')).toBe(-1);

    // 1.0.10 is greater than 1.0.9
    expect(compareSemver('1.0.10', '1.0.9')).toBe(1);
    expect(compareSemver('1.0.9', '1.0.10')).toBe(-1);
  });

  it('should handle prefixes and build/prerelease suffixes', () => {
    expect(compareSemver('v2.5.0', '2.5.0')).toBe(0);
    expect(compareSemver('2.5.0+10', '2.5.0')).toBe(0);
    expect(compareSemver('2.5.0-beta.1', '2.4.9')).toBe(1);
  });

  it('should handle short version strings like 2 or 2.5', () => {
    expect(compareSemver('2', '2.0.0')).toBe(0);
    expect(compareSemver('2.5', '2.5.0')).toBe(0);
    expect(compareSemver('2.5', '2.6.0')).toBe(-1);
  });
});
