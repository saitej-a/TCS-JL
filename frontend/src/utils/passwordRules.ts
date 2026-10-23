/**
 * The one source of the password policy on the client (9.5.1 D-10): min 10
 * characters plus one uppercase, one lowercase, one digit and one special
 * (non-alphanumeric) — the exact mirror of the server's
 * `ComplexityPasswordValidator` (apps/accounts/validation.py, T2.4).
 *
 * apps/accounts/tests/test_password_rules_parity.py READS THIS FILE and fails
 * the backend suite if the two stacks drift — change both sides together.
 * Pure data/helpers: no React imports.
 */

export const PASSWORD_MIN_LENGTH = 10;

export type PasswordRuleId = "length" | "upper" | "lower" | "digit" | "special";

export interface PasswordRule {
  id: PasswordRuleId;
  label: string;
  test: (password: string) => boolean;
}

/** The four character classes — ids are the parity test's contract. */
export const CHARACTER_CLASSES: readonly {
  id: Exclude<PasswordRuleId, "length">;
  label: string;
  pattern: RegExp;
}[] = [
  { id: "upper", label: "one uppercase letter (A-Z)", pattern: /[A-Z]/ },
  { id: "lower", label: "one lowercase letter (a-z)", pattern: /[a-z]/ },
  { id: "digit", label: "one digit (0-9)", pattern: /[0-9]/ },
  { id: "special", label: "one special character (e.g. !@#%…)", pattern: /[^A-Za-z0-9]/ },
] as const;

/** Every rule, in stable display/check order: length first, then classes. */
export const RULE_LABELS: readonly PasswordRule[] = [
  {
    id: "length",
    label: `at least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  ...CHARACTER_CLASSES.map((c) => ({
    id: c.id,
    label: c.label,
    test: (password: string) => c.pattern.test(password),
  })),
];

export interface RuleFailure {
  id: PasswordRuleId;
  label: string;
}

/** The failed rules, in stable order. Empty array = the password is valid. */
export function validatePassword(password: string): RuleFailure[] {
  return RULE_LABELS.filter((rule) => !rule.test(password)).map(({ id, label }) => ({
    id,
    label,
  }));
}
