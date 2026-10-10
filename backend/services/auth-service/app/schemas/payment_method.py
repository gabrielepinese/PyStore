from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from app.core.card_brands import detect_brand


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PaymentMethodRead(_CamelModel):
    """What the client ever sees back — brand + last 4 only, never the full
    number. There is no CVV field anywhere in this model: it's never asked
    for, so there's nothing to leak or store by mistake."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: str
    brand: str
    last4: str
    exp_month: int
    exp_year: int
    cardholder_name: str
    is_default: bool
    created_at: datetime


class PaymentMethodCreate(_CamelModel):
    """`card_number` and `cvv` are write-only: the service derives
    `brand`/`last4` from the card number and the full value is discarded
    right after, never written to the DB or to a log line. `cvv` is checked
    for shape only — it's never read by the service, never stored anywhere,
    and isn't even kept on this object past validation."""

    card_number: str = Field(min_length=12, max_length=19)
    cvv: str = Field(min_length=3, max_length=4)
    cardholder_name: str = Field(min_length=2)
    exp_month: int = Field(ge=1, le=12)
    exp_year: int = Field(ge=2000, le=2100)
    is_default: bool = False

    @field_validator("card_number")
    @classmethod
    def _digits_only(cls, value: str) -> str:
        stripped = value.replace(" ", "").replace("-", "")
        if not stripped.isdigit():
            raise ValueError("Card number must contain only digits")
        if detect_brand(stripped) is None:
            raise ValueError("Card number must be a valid Visa, Mastercard, or American Express number")
        return stripped

    @field_validator("cvv")
    @classmethod
    def _cvv_digits_only(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("CVV must contain only digits")
        return value

    @model_validator(mode="after")
    def _cvv_matches_brand(self) -> Self:
        expected_length = 4 if detect_brand(self.card_number) == "American Express" else 3
        if len(self.cvv) != expected_length:
            raise ValueError(f"CVV must be {expected_length} digits for this card brand")
        return self


class PaymentMethodUpdate(_CamelModel):
    """Only what's safe to edit after the fact — the card number itself is
    immutable (deleting and re-adding is the only way to change it)."""

    is_default: bool = False
