from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


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
    """`card_number` is write-only: the service derives `brand`/`last4` from
    it and the full value is discarded right after, never written to the DB
    or to a log line."""

    card_number: str = Field(min_length=12, max_length=19)
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
        return stripped


class PaymentMethodUpdate(_CamelModel):
    """Only what's safe to edit after the fact — the card number itself is
    immutable (deleting and re-adding is the only way to change it)."""

    is_default: bool = False
