from fastapi import APIRouter, Request, Query, HTTPException
from core.config import get_settings, get_supabase

router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.get("/whatsapp")
def verify_whatsapp(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    s = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == s.whatsapp_webhook_verify_token:
        return int(hub_challenge)
    raise HTTPException(403, "Verification failed")


@router.post("/whatsapp")
async def receive_whatsapp(request: Request):
    db = get_supabase()
    body = await request.json()
    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            # Delivery status updates
            for status in value.get("statuses", []):
                msg_id = status.get("id")
                status_val = status.get("status")  # sent, delivered, read, failed
                if msg_id and status_val:
                    db.table("delivery_logs")\
                        .update({"status": status_val})\
                        .eq("platform_message_id", msg_id)\
                        .execute()
            # Incoming messages (handle STOP)
            for message in value.get("messages", []):
                from_number = message.get("from")
                if message.get("type") == "text":
                    text = message["text"]["body"].strip().upper()
                    if text in ("STOP", "UNSUBSCRIBE", "CANCEL", "QUIT"):
                        db.table("opt_outs").upsert({
                            "phone_number": f"+{from_number}",
                            "platform": "whatsapp"
                        }).execute()
                        db.table("recipients")\
                            .update({"is_opted_out": True})\
                            .eq("phone_number", f"+{from_number}")\
                            .execute()
    return {"status": "ok"}
