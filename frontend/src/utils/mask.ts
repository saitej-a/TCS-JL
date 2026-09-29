/**
 * PII masking for staff surfaces (9.5 Task 8's hard rule): reporter/subject
 * identities may appear in admin UI only masked — `a***@example.com`,
 * `+91 ******4321`. Today the reports serializer ships no identity fields at
 * all (04 §63), but the masking utilities exist so any future field that
 * carries an identity goes through them, and the admin tests fail if an
 * unmasked email/phone shape ever reaches the DOM.
 */

/** Keep the first character + domain; star the rest of the local part. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  return `${local[0]}${"*".repeat(Math.max(3, local.length - 1))}${domain}`;
}

/** Keep the country prefix and last 4; star the middle. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  const last4 = digits.slice(-4);
  const starred = "*".repeat(Math.max(6, digits.length - 4));
  const prefix = phone.trimStart().startsWith("+") ? "+91 " : "";
  return `${prefix}${starred}${last4}`;
}

export function isMaskedEmail(value: string): boolean {
  return /^[^@\s]\*+@/.test(value);
}

export function isMaskedPhone(value: string): boolean {
  return /^\+91 \*+\d{4}$/.test(value);
}
