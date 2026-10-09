import { PHONE_PREFIXES, DEFAULT_PHONE_PREFIX } from '../data/phone-prefixes';

export const PHONE_NUMBER_PATTERN = /^\d{6,12}$/;
export const POSTAL_CODE_PATTERN = /^\d{5}$/;

export function splitPhone(phone: string | null): { prefix: string; number: string } {
  if (!phone) {
    return { prefix: DEFAULT_PHONE_PREFIX, number: '' };
  }

  const compact = phone.replace(/\s+/g, '');
  const match = PHONE_PREFIXES.filter((p) => compact.startsWith(p.code)).sort(
    (a, b) => b.code.length - a.code.length,
  )[0];

  if (!match) {
    return { prefix: DEFAULT_PHONE_PREFIX, number: compact };
  }

  return { prefix: match.code, number: compact.slice(match.code.length) };
}

export function joinPhone(prefix: string, number: string): string | null {
  const trimmed = number.trim();
  return trimmed ? `${prefix} ${trimmed}` : null;
}
