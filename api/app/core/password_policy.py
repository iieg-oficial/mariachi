import re

MIN_LENGTH = 8
MIN_RULES_PASSED = 3

_LOWER_RE = re.compile(r"[a-z]")
_UPPER_RE = re.compile(r"[A-Z]")
_DIGIT_RE = re.compile(r"\d")
_SPECIAL_RE = re.compile(r"[^A-Za-z0-9]")


def _evaluate_rules(password: str) -> dict[str, bool]:
    return {
        "length": len(password) >= MIN_LENGTH,
        "case": bool(_LOWER_RE.search(password)) and bool(_UPPER_RE.search(password)),
        "number": bool(_DIGIT_RE.search(password)),
        "special": bool(_SPECIAL_RE.search(password)),
    }


def validate_password_strength(password: str) -> str:
    rules = _evaluate_rules(password)
    if not rules["length"]:
        raise ValueError(f"La contraseña debe tener al menos {MIN_LENGTH} caracteres")
    passed = sum(1 for ok in rules.values() if ok)
    if passed < MIN_RULES_PASSED:
        raise ValueError(
            "La contraseña debe cumplir al menos 3 de: mayúsculas y minúsculas, números, caracteres especiales"
        )
    return password
