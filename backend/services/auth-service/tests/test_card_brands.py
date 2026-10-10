import pytest

from app.core.card_brands import detect_brand


@pytest.mark.parametrize(
    ("card_number", "expected_brand"),
    [
        ("4242424242424242", "Visa"),
        ("4000056655665556", "Visa"),
        ("4222222222222", "Visa"),  # 13-digit Visa
        ("4242424242424242999", "Visa"),  # 19-digit Visa
        ("5555555555554444", "Mastercard"),
        ("2221000000000009", "Mastercard"),  # 2-series Mastercard BIN
        ("371449635398431", "American Express"),
        ("340000000000009", "American Express"),
    ],
)
def test_detect_brand_recognizes_accepted_brands(card_number: str, expected_brand: str) -> None:
    assert detect_brand(card_number) == expected_brand


@pytest.mark.parametrize(
    "card_number",
    [
        "6011111111111117",  # Discover — not an accepted brand
        "1234567890123456",  # no recognized BIN prefix
        "424242424242",  # Visa prefix but wrong length (12 digits)
        "37144963539843",  # Amex prefix but wrong length (14 digits)
        "",
    ],
)
def test_detect_brand_rejects_unsupported_or_malformed_numbers(card_number: str) -> None:
    assert detect_brand(card_number) is None
