export function normalizePhone(phone: string): string {
  if (!phone) return phone;
  // Remove all non-numeric characters except the leading +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, and it's 10 digits, assume India (+91)
  if (!normalized.startsWith('+') && normalized.length === 10) {
    normalized = '+91' + normalized;
  }
  
  return normalized;
}
