import { describe, expect, it } from "vitest";

import {
  CHARACTER_CLASSES,
  PASSWORD_MIN_LENGTH,
  RULE_LABELS,
  validatePassword,
} from "@/utils/passwordRules";

describe("passwordRules (the shared policy module)", () => {
  it("pins the exported policy set", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(CHARACTER_CLASSES.map((c) => c.id)).toEqual(["upper", "lower", "digit", "special"]);
    // Length rule first, then the four classes — stable display order.
    expect(RULE_LABELS.map((r) => r.id)).toEqual(["length", "upper", "lower", "digit", "special"]);
    for (const rule of RULE_LABELS) {
      expect(rule.label.length).toBeGreaterThan(0);
    }
  });

  it("fails a password missing the uppercase class", () => {
    expect(validatePassword("abcdefghi1!").map((f) => f.id)).toEqual(["upper"]);
  });

  it("fails an all-alphanumeric password on the special class", () => {
    expect(validatePassword("Abcdefghi1").map((f) => f.id)).toEqual(["special"]);
  });

  it("fails a 9-char valid-shape password on length only", () => {
    expect(validatePassword("Abcdefg1!").map((f) => f.id)).toEqual(["length"]);
  });

  it("accepts a policy-compliant password", () => {
    expect(validatePassword("Str0ng!Pass")).toEqual([]);
  });

  it("treats the empty password as failing everything", () => {
    expect(validatePassword("").map((f) => f.id)).toEqual([
      "length",
      "upper",
      "lower",
      "digit",
      "special",
    ]);
  });
});
