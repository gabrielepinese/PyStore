import re

# Only these three brands are accepted. Each entry pairs the BIN prefix
# pattern with the exact digit lengths that brand issues — a prefix match
# alone isn't enough (e.g. a 14-digit number starting with 4 isn't a real
# Visa card).
_BRAND_RULES: list[tuple[str, re.Pattern[str], frozenset[int]]] = [
    ("Visa", re.compile(r"^4"), frozenset({13, 16, 19})),
    (
        "Mastercard",
        re.compile(r"^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)"),
        frozenset({16}),
    ),
    ("American Express", re.compile(r"^3[47]"), frozenset({15})),
]


def detect_brand(card_number: str) -> str | None:
    """Returns the brand name for a digits-only card number, or None if it
    doesn't match a Visa/Mastercard/Amex prefix+length combination."""
    for brand, pattern, lengths in _BRAND_RULES:
        if pattern.match(card_number) and len(card_number) in lengths:
            return brand
    return None
