export interface PhonePrefix {
  code: string;
  country: string;
}

export const PHONE_PREFIXES: PhonePrefix[] = [
  { code: '+39', country: 'Italia' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'Regno Unito' },
  { code: '+33', country: 'Francia' },
  { code: '+34', country: 'Spagna' },
  { code: '+49', country: 'Germania' },
  { code: '+41', country: 'Svizzera' },
  { code: '+43', country: 'Austria' },
  { code: '+31', country: 'Paesi Bassi' },
  { code: '+32', country: 'Belgio' },
  { code: '+351', country: 'Portogallo' },
  { code: '+30', country: 'Grecia' },
  { code: '+353', country: 'Irlanda' },
  { code: '+420', country: 'Rep. Ceca' },
  { code: '+48', country: 'Polonia' },
];

export const DEFAULT_PHONE_PREFIX = '+39';
