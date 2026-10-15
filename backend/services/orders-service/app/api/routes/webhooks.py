import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.services import order_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
settings = get_settings()


@router.post("/stripe", status_code=status.HTTP_204_NO_CONTENT)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> None:
    """Belt-and-suspenders confirmation path: the client already calls
    `/orders/{id}/confirm` right after Stripe.js resolves, so the UI doesn't
    depend on this. But a client can go offline mid-flow after Stripe has
    already charged the card, so this is what actually guarantees the order
    gets marked paid. Needs `stripe listen --forward-to` to reach this
    locally — see Stripe CLI docs.
    """
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    if not settings.stripe_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Webhook secret not configured"
        )

    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature") from exc

    intent = event["data"]["object"]
    if event["type"] == "payment_intent.succeeded":
        order_service.mark_paid_by_intent(db, intent["id"])
    elif event["type"] == "payment_intent.payment_failed":
        order_service.mark_failed_by_intent(db, intent["id"])
