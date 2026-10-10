import { FormBuilder } from '@angular/forms';
import {
  cardNumberValidator,
  cvvLengthForBrand,
  cvvValidator,
  detectCardBrand,
  normalizeCardNumber,
} from './card-number';

describe('normalizeCardNumber', () => {
  it('strips spaces and dashes', () => {
    expect(normalizeCardNumber('4242 4242-4242 4242')).toBe('4242424242424242');
  });

  it('leaves a plain digit string unchanged', () => {
    expect(normalizeCardNumber('4242424242424242')).toBe('4242424242424242');
  });
});

describe('detectCardBrand', () => {
  it('recognizes Visa (13, 16, 19 digits)', () => {
    expect(detectCardBrand('4222222222222')).toBe('Visa');
    expect(detectCardBrand('4242424242424242')).toBe('Visa');
    expect(detectCardBrand('4242424242424242999')).toBe('Visa');
  });

  it('recognizes Mastercard (16 digits, both BIN ranges)', () => {
    expect(detectCardBrand('5555555555554444')).toBe('Mastercard');
    expect(detectCardBrand('2221000000000009')).toBe('Mastercard');
  });

  it('recognizes American Express (15 digits)', () => {
    expect(detectCardBrand('371449635398431')).toBe('American Express');
  });

  it('rejects Discover and other unsupported brands', () => {
    expect(detectCardBrand('6011111111111117')).toBeNull();
  });

  it('rejects a brand-prefixed number with the wrong length', () => {
    expect(detectCardBrand('424242424242')).toBeNull(); // Visa prefix, 12 digits
  });

  it('rejects an empty string', () => {
    expect(detectCardBrand('')).toBeNull();
  });
});

describe('cvvLengthForBrand', () => {
  it('is 4 for American Express', () => {
    expect(cvvLengthForBrand('American Express')).toBe(4);
  });

  it('is 3 for Visa, Mastercard, or no brand yet', () => {
    expect(cvvLengthForBrand('Visa')).toBe(3);
    expect(cvvLengthForBrand('Mastercard')).toBe(3);
    expect(cvvLengthForBrand(null)).toBe(3);
  });
});

describe('cardNumberValidator', () => {
  const fb = new FormBuilder();

  it('passes for a real, Luhn-valid Visa number', () => {
    const control = fb.control('4242424242424242');
    expect(cardNumberValidator(control)).toBeNull();
  });

  it('passes for an empty value (required is a separate validator)', () => {
    const control = fb.control('');
    expect(cardNumberValidator(control)).toBeNull();
  });

  it('fails when the value contains letters', () => {
    const control = fb.control('4242abcd42424242');
    expect(cardNumberValidator(control)).toEqual({ cardNumber: true });
  });

  it('fails for an unsupported brand (Discover)', () => {
    const control = fb.control('6011111111111117');
    expect(cardNumberValidator(control)).toEqual({ cardNumber: true });
  });

  it('fails a Luhn checksum mismatch even with a valid brand prefix+length', () => {
    // Visa prefix, 16 digits, but the checksum digit is wrong.
    const control = fb.control('4242424242424241');
    expect(cardNumberValidator(control)).toEqual({ cardNumber: true });
  });
});

describe('cvvValidator', () => {
  const fb = new FormBuilder();

  function groupWith(cardNumber: string, cvv: string) {
    return fb.group({ cardNumber: [cardNumber], cvv: [cvv] });
  }

  it('passes a 3-digit CVV for a Visa number', () => {
    expect(cvvValidator(groupWith('4242424242424242', '123'))).toBeNull();
  });

  it('passes a 4-digit CVV for an Amex number', () => {
    expect(cvvValidator(groupWith('371449635398431', '1234'))).toBeNull();
  });

  it('fails a 4-digit CVV against a Visa number', () => {
    expect(cvvValidator(groupWith('4242424242424242', '1234'))).toEqual({ cvv: true });
  });

  it('fails a 3-digit CVV against an Amex number', () => {
    expect(cvvValidator(groupWith('371449635398431', '123'))).toEqual({ cvv: true });
  });

  it('fails a non-digit CVV', () => {
    expect(cvvValidator(groupWith('4242424242424242', 'abc'))).toEqual({ cvv: true });
  });

  it('passes an empty CVV (required is a separate validator)', () => {
    expect(cvvValidator(groupWith('4242424242424242', ''))).toBeNull();
  });
});
