/** Standard KRA PIN shape: one letter, nine digits, one letter (e.g. A123456789Z). */
export const KRA_PIN_REGEX = /^[A-Z]\d{9}[A-Z]$/;

export function isValidKraPin(pin: string): boolean {
  return KRA_PIN_REGEX.test(pin);
}
