"""Cross-stack password-policy parity guard (9.5.1 D-10).

The frontend's ``frontend/src/utils/passwordRules.ts`` is the client mirror of
``ComplexityPasswordValidator``. This test READS the TS source — the same
file-inspecting idiom as the phase-boundary tests — and fails the backend
suite if either side drifts, so the shipped "8 characters" class of bug cannot
come back silently. Change both files together, deliberately.
"""

import re
from pathlib import Path

import pytest
from django.core.exceptions import ValidationError

from apps.accounts.validation import ComplexityPasswordValidator

REPO_ROOT = Path(__file__).resolve().parents[3]
RULES_PATH = REPO_ROOT / "frontend" / "src" / "utils" / "passwordRules.ts"

EXPECTED_CLASS_IDS = {"upper", "lower", "digit", "special"}


def _rules_source() -> str:
    assert RULES_PATH.exists(), f"password rules module missing: {RULES_PATH}"
    return RULES_PATH.read_text(encoding="utf-8")


def test_frontend_min_length_matches_validator():
    match = re.search(r"PASSWORD_MIN_LENGTH\s*=\s*(\d+)", _rules_source())
    assert match, "PASSWORD_MIN_LENGTH not found in passwordRules.ts"
    assert int(match.group(1)) == ComplexityPasswordValidator.DEFAULT_MIN_LENGTH


def test_frontend_declares_exactly_the_validators_four_classes():
    block = re.search(
        r"CHARACTER_CLASSES(?::[^=]+)?\s*=\s*\[(.*?)\]\s*as const",
        _rules_source(),
        re.DOTALL,
    )
    assert block, "CHARACTER_CLASSES block not found in passwordRules.ts"
    ids = set(re.findall(r'id:\s*"(upper|lower|digit|special)"', block.group(1)))
    assert ids == EXPECTED_CLASS_IDS


@pytest.mark.parametrize(
    ("password", "expected_code"),
    [
        ("alllowercase1!", "password_no_upper"),
        ("ALLUPPERCASE1!", "password_no_lower"),
        ("NoDigitsHere!", "password_no_digit"),
        ("NoSpecial11A", "password_no_special"),
    ],
)
def test_validator_really_enforces_each_class(password, expected_code):
    """The four ids above are not just a literal: the validator rejects a
    password missing each one, so the set it enforces is exactly these."""
    with pytest.raises(ValidationError) as err:
        ComplexityPasswordValidator().validate(password)
    codes = {e.code for e in err.value.error_list}
    assert expected_code in codes
