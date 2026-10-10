import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Only the brands the payment form accepts — anything else is rejected. */
export type CardBrand = 'Visa' | 'Mastercard' | 'American Express';

interface BrandRule {
  brand: CardBrand;
  prefix: RegExp;
  lengths: number[];
}

const BRAND_RULES: BrandRule[] = [
  { brand: 'Visa', prefix: /^4/, lengths: [13, 16, 19] },
  {
    brand: 'Mastercard',
    prefix: /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/,
    lengths: [16],
  },
  { brand: 'American Express', prefix: /^3[47]/, lengths: [15] },
];

export function normalizeCardNumber(value: string): string {
  return value.replace(/[\s-]/g, '');
}

export function detectCardBrand(digits: string): CardBrand | null {
  const rule = BRAND_RULES.find((r) => r.prefix.test(digits) && r.lengths.includes(digits.length));
  return rule?.brand ?? null;
}

/** Amex prints a 4-digit CID on the front; every other brand has a 3-digit CVV on the back. */
export function cvvLengthForBrand(brand: CardBrand | null): number {
  return brand === 'American Express' ? 4 : 3;
}

function passesLuhnCheck(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Rejects anything that isn't digits-only, doesn't match a Visa/Mastercard/
 * Amex prefix+length, or fails the Luhn checksum — same baseline real card
 * issuers use, so typos get caught before the request ever leaves the form.
 */
export function cardNumberValidator(control: AbstractControl): ValidationErrors | null {
  const raw: string = control.value ?? '';
  if (!raw.trim()) {
    return null;
  }

  const digits = normalizeCardNumber(raw);
  if (!/^\d+$/.test(digits) || !detectCardBrand(digits) || !passesLuhnCheck(digits)) {
    return { cardNumber: true };
  }

  return null;
}

/**
 * Group-level validator: the CVV's required length depends on the sibling
 * card number's brand (3 digits, or 4 for Amex), so it can't live on the
 * `cvv` control alone.
 */
export function cvvValidator(group: AbstractControl): ValidationErrors | null {
  const cvv: string = group.get('cvv')?.value ?? '';
  if (!cvv.trim()) {
    return null;
  }

  const cardNumber: string = group.get('cardNumber')?.value ?? '';
  const brand = detectCardBrand(normalizeCardNumber(cardNumber));
  const expectedLength = cvvLengthForBrand(brand);

  return /^\d+$/.test(cvv) && cvv.length === expectedLength ? null : { cvv: true };
}
