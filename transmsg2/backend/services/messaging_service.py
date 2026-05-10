import httpx
import asyncio
import logging
import random
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Test Mode Simulator ───────────────────────────────────────────────────────

async def simulate_send(to: str, message: str) -> dict:
    """Simulate sending in test mode with realistic delay and occasional failures."""
    await asyncio.sleep(random.uniform(0.05, 0.15))
    # Simulate 96% success rate
    success = random.random() > 0.04
    return {
        "success": success,
        "message_id": f"test_{random.randint(100000, 999999)}" if success else None,
        "error": None if success else "Simulated delivery failure",
    }


# ── WhatsApp Business API ─────────────────────────────────────────────────────

async def send_whatsapp(to: str, message: str, phone_number_id: str, access_token: str) -> dict:
    url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return {"success": True, "message_id": data.get("messages", [{}])[0].get("id"), "error": None}
        except Exception as e:
            return {"success": False, "message_id": None, "error": str(e)}


# ── Twilio SMS ────────────────────────────────────────────────────────────────

def send_twilio_sms(to: str, message: str, account_sid: str, auth_token: str, from_number: str) -> dict:
    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        msg = client.messages.create(body=message, from_=from_number, to=to)
        return {"success": True, "message_id": msg.sid, "error": None}
    except Exception as e:
        return {"success": False, "message_id": None, "error": str(e)}


# ── Telegram ──────────────────────────────────────────────────────────────────

async def send_telegram(chat_id: str, message: str, bot_token: str) -> dict:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": message, "parse_mode": "HTML"}
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return {"success": True, "message_id": str(resp.json().get("result", {}).get("message_id")), "error": None}
        except Exception as e:
            return {"success": False, "message_id": None, "error": str(e)}


# ── Unified Send ──────────────────────────────────────────────────────────────

async def send_message(to: str, message: str, account: dict, test_mode: bool = True) -> dict:
    """Send a single message via the appropriate platform, or simulate if test_mode."""
    if test_mode or account.get("is_test_mode", True):
        result = await simulate_send(to, message)
        result["test_mode"] = True
        return result

    platform = account.get("platform", "").lower()
    result = {}

    if platform == "whatsapp":
        result = await send_whatsapp(
            to=to,
            message=message,
            phone_number_id=account.get("phone_number_id", ""),
            access_token=account.get("access_token", ""),
        )
    elif platform == "sms":
        result = send_twilio_sms(
            to=to,
            message=message,
            account_sid=account.get("twilio_sid", ""),
            auth_token=account.get("twilio_token", ""),
            from_number=account.get("from_number", ""),
        )
    elif platform == "telegram":
        result = await send_telegram(
            chat_id=to,
            message=message,
            bot_token=account.get("bot_token", ""),
        )
    else:
        result = {"success": False, "message_id": None, "error": f"Unknown platform: {platform}"}

    result["test_mode"] = False
    return result


# ── Batch Sender ──────────────────────────────────────────────────────────────

async def send_batch(
    numbers: list[str],
    message: str,
    account: dict,
    assignment_id: str,
    campaign_id: str,
    supabase,
    rate_per_minute: int = 1000,
    test_mode: bool = True,
) -> dict:
    """
    Send messages to a list of numbers with rate limiting.
    Updates Supabase in real time as messages are sent.
    """
    delay = 60.0 / rate_per_minute
    delivered = 0
    failed = 0

    for number in numbers:
        result = await send_message(number, message, account, test_mode)

        status = "delivered" if result["success"] else "failed"
        if result["success"]:
            delivered += 1
        else:
            failed += 1

        # Log each delivery to Supabase
        try:
            supabase.table("delivery_logs").insert({
                "campaign_id": campaign_id,
                "assignment_id": assignment_id,
                "account_id": account["id"],
                "recipient_phone": number,
                "message_body": message,
                "status": status,
                "platform_message_id": result.get("message_id"),
                "error_message": result.get("error"),
            }).execute()
        except Exception as e:
            logger.error(f"Failed to log delivery: {e}")

        # Update assignment progress
        try:
            supabase.table("campaign_assignments").update({
                "sent_count": delivered + failed,
                "delivered_count": delivered,
                "failed_count": failed,
            }).eq("id", assignment_id).execute()
        except Exception as e:
            logger.error(f"Failed to update assignment: {e}")

        await asyncio.sleep(delay)

    # Mark assignment complete
    supabase.table("campaign_assignments").update({
        "status": "completed",
        "delivered_count": delivered,
        "failed_count": failed,
        "sent_count": delivered + failed,
    }).eq("id", assignment_id).execute()

    return {"delivered": delivered, "failed": failed, "total": len(numbers)}
