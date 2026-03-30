export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remove all non-numeric characters except the leading +
  let normalized = phone.replace(/[^\d+]/g, '');

  // If it starts with 00, replace with +
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.substring(2);
  }

  // If it doesn't start with +, and it's 10 digits, assume India (+91)
  if (!normalized.startsWith('+') && normalized.length === 10) {
    normalized = '+91' + normalized;
  }

  // If it's 12 digits starting with 91 but no +, add +
  if (!normalized.startsWith('+') && normalized.length === 12 && normalized.startsWith('91')) {
    normalized = '+' + normalized;
  }

  return normalized;
}
