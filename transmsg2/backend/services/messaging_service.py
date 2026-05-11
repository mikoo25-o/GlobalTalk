import httpx
import asyncio
import logging
import random
from datetime import datetime
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ─────────────────────────────────────────────────────────────
# TEST MODE SIMULATOR
# ─────────────────────────────────────────────────────────────

async def simulate_send(to: str, message: str) -> dict:
    """
    Simulate realistic message delivery in test mode.
    """

    await asyncio.sleep(random.uniform(0.05, 0.15))

    success = random.random() > 0.04

    return {
        "success": success,
        "message_id": f"test_{random.randint(100000, 999999)}" if success else None,
        "error": None if success else "Simulated delivery failure",
        "provider_response": "SIMULATED",
    }


# ─────────────────────────────────────────────────────────────
# WHATSAPP BUSINESS API
# ─────────────────────────────────────────────────────────────

async def send_whatsapp(
    to: str,
    message: str,
    phone_number_id: str,
    access_token: str
) -> dict:

    url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": message
        },
    }

    try:

        async with httpx.AsyncClient(timeout=15) as client:

            resp = await client.post(
                url,
                headers=headers,
                json=payload
            )

            resp.raise_for_status()

            data = resp.json()

            return {
                "success": True,
                "message_id": data.get("messages", [{}])[0].get("id"),
                "error": None,
                "provider_response": data,
            }

    except Exception as e:

        logger.error(f"WhatsApp send failed: {e}")

        return {
            "success": False,
            "message_id": None,
            "error": str(e),
            "provider_response": None,
        }


# ─────────────────────────────────────────────────────────────
# TWILIO SMS
# ─────────────────────────────────────────────────────────────

def send_twilio_sms(
    to: str,
    message: str,
    account_sid: str,
    auth_token: str,
    from_number: str
) -> dict:

    try:

        from twilio.rest import Client

        client = Client(account_sid, auth_token)

        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=to
        )

        return {
            "success": True,
            "message_id": msg.sid,
            "error": None,
            "provider_response": str(msg.status),
        }

    except Exception as e:

        logger.error(f"Twilio SMS failed: {e}")

        return {
            "success": False,
            "message_id": None,
            "error": str(e),
            "provider_response": None,
        }


# ─────────────────────────────────────────────────────────────
# TELEGRAM
# ─────────────────────────────────────────────────────────────

async def send_telegram(
    chat_id: str,
    message: str,
    bot_token: str
) -> dict:

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }

    try:

        async with httpx.AsyncClient(timeout=15) as client:

            resp = await client.post(
                url,
                json=payload
            )

            resp.raise_for_status()

            data = resp.json()

            return {
                "success": True,
                "message_id": str(
                    data.get("result", {}).get("message_id")
                ),
                "error": None,
                "provider_response": data,
            }

    except Exception as e:

        logger.error(f"Telegram send failed: {e}")

        return {
            "success": False,
            "message_id": None,
            "error": str(e),
            "provider_response": None,
        }


# ─────────────────────────────────────────────────────────────
# PERSONALIZATION
# ─────────────────────────────────────────────────────────────

def personalize_message(message: str, recipient: dict) -> str:

    personalized = message

    for key, value in recipient.items():

        personalized = personalized.replace(
            f"{{{{{key}}}}}",
            str(value)
        )

    return personalized


# ─────────────────────────────────────────────────────────────
# UNIFIED SEND
# ─────────────────────────────────────────────────────────────

async def send_message(
    to: str,
    message: str,
    account: dict,
    test_mode: bool = True,
    retries: int = 2
) -> dict:

    if test_mode or account.get("is_test_mode", True):

        result = await simulate_send(to, message)

        result["test_mode"] = True

        return result

    platform = account.get("platform", "").lower()

    for attempt in range(retries + 1):

        try:

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

                result = {
                    "success": False,
                    "message_id": None,
                    "error": f"Unknown platform: {platform}",
                    "provider_response": None,
                }

            result["test_mode"] = False

            if result["success"]:
                return result

        except Exception as e:

            logger.error(f"Send attempt failed: {e}")

            result = {
                "success": False,
                "message_id": None,
                "error": str(e),
                "provider_response": None,
            }

        await asyncio.sleep(1.5 * (attempt + 1))

    return result


# ─────────────────────────────────────────────────────────────
# BATCH SENDER
# ─────────────────────────────────────────────────────────────

async def send_batch(
    numbers: list,
    message: str,
    account: dict,
    assignment_id: str,
    campaign_id: str,
    supabase,
    rate_per_minute: int = 1000,
    test_mode: bool = True,
) -> dict:

    delay = max(60.0 / rate_per_minute, 0.01)

    delivered = 0
    failed = 0
    processed = 0

    logger.info(
        f"Starting batch for assignment {assignment_id}"
    )

    # Mark assignment running

    try:

        supabase.table("campaign_assignments").update({
            "status": "running",
            "started_at": datetime.utcnow().isoformat(),
        }).eq("id", assignment_id).execute()

    except Exception as e:

        logger.error(f"Failed to mark assignment running: {e}")

    for recipient in numbers:

        # Campaign stop check

        try:

            campaign = supabase.table("campaigns") \
                .select("status") \
                .eq("id", campaign_id) \
                .single() \
                .execute() \
                .data

            if campaign["status"] in ["paused", "cancelled"]:

                logger.warning(
                    f"Campaign {campaign_id} stopped during sending"
                )

                supabase.table("campaign_assignments").update({
                    "status": campaign["status"]
                }).eq("id", assignment_id).execute()

                return {
                    "delivered": delivered,
                    "failed": failed,
                    "total": processed,
                    "status": campaign["status"],
                }

        except Exception as e:

            logger.error(f"Campaign status check failed: {e}")

        # Normalize recipient

        if isinstance(recipient, dict):

            phone_number = recipient.get("phone_number")

            final_message = personalize_message(
                message,
                recipient
            )

        else:

            phone_number = recipient
            final_message = message

        # Send message

        result = await send_message(
            to=phone_number,
            message=final_message,
            account=account,
            test_mode=test_mode,
        )

        status = "delivered" if result["success"] else "failed"

        processed += 1

        if result["success"]:
            delivered += 1
        else:
            failed += 1

        # Delivery log

        try:

            supabase.table("delivery_logs").insert({
                "campaign_id": campaign_id,
                "assignment_id": assignment_id,
                "account_id": account["id"],
                "recipient_phone": phone_number,
                "message_body": final_message,
                "status": status,
                "platform_message_id": result.get("message_id"),
                "error_message": result.get("error"),
                "provider_response": str(
                    result.get("provider_response")
                ),
                "created_at": datetime.utcnow().isoformat(),
            }).execute()

        except Exception as e:

            logger.error(f"Delivery log insert failed: {e}")

        # Assignment progress update

        try:

            supabase.table("campaign_assignments").update({
                "sent_count": processed,
                "delivered_count": delivered,
                "failed_count": failed,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", assignment_id).execute()

        except Exception as e:

            logger.error(f"Assignment update failed: {e}")

        # Campaign progress update

        try:

            supabase.table("campaigns").update({
                "total_sent": processed,
                "total_delivered": delivered,
                "total_failed": failed,
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", campaign_id).execute()

        except Exception as e:

            logger.error(f"Campaign totals update failed: {e}")

        await asyncio.sleep(delay)

    # Complete assignment

    try:

        supabase.table("campaign_assignments").update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "sent_count": processed,
            "delivered_count": delivered,
            "failed_count": failed,
        }).eq("id", assignment_id).execute()

    except Exception as e:

        logger.error(f"Failed final assignment update: {e}")

    logger.info(
        f"Completed assignment {assignment_id} "
        f"Delivered={delivered} Failed={failed}"
    )

    return {
        "delivered": delivered,
        "failed": failed,
        "total": processed,
        "status": "completed",
    }