from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
import logging

from core.config import get_supabase

router = APIRouter(
    prefix="/accounts",
    tags=["accounts"]
)

logger = logging.getLogger(__name__)

SUPPORTED_PLATFORMS = {
    "whatsapp",
    "telegram",
    "sms"
}


# ─────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):

    name: str

    platform: str

    identifier: str

    access_token: Optional[str] = None

    phone_number_id: Optional[str] = None

    bot_token: Optional[str] = None

    twilio_sid: Optional[str] = None

    twilio_token: Optional[str] = None

    from_number: Optional[str] = None

    daily_limit: int = 1000

    is_test_mode: bool = True


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def validate_platform(platform: str):

    if platform not in SUPPORTED_PLATFORMS:

        raise HTTPException(
            status_code=400,
            detail="Platform must be whatsapp, telegram, or sms"
        )


def determine_test_mode(data: dict) -> bool:

    platform = data.get("platform")

    if (
        platform == "whatsapp"
        and data.get("access_token")
        and data.get("phone_number_id")
    ):
        return False

    if (
        platform == "telegram"
        and data.get("bot_token")
    ):
        return False

    if (
        platform == "sms"
        and data.get("twilio_sid")
        and data.get("twilio_token")
    ):
        return False

    return True


def mask_sensitive_fields(account: dict):

    safe = dict(account)

    sensitive_fields = [
        "access_token",
        "bot_token",
        "twilio_token",
    ]

    for field in sensitive_fields:

        if safe.get(field):

            safe[field] = "********"

    return safe


# ─────────────────────────────────────────────────────────────
# LIST ACCOUNTS
# ─────────────────────────────────────────────────────────────

@router.get("/")
def list_accounts():

    db = get_supabase()

    result = (
        db.table("accounts")
        .select("*")
        .order("created_at")
        .execute()
    )

    accounts = result.data or []

    return [
        mask_sensitive_fields(a)
        for a in accounts
    ]


# ─────────────────────────────────────────────────────────────
# GET ACCOUNT
# ─────────────────────────────────────────────────────────────

@router.get("/{account_id}")
def get_account(account_id: str):

    db = get_supabase()

    result = (
        db.table("accounts")
        .select("*")
        .eq("id", account_id)
        .single()
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Account not found"
        )

    return mask_sensitive_fields(result.data)


# ─────────────────────────────────────────────────────────────
# CREATE ACCOUNT
# ─────────────────────────────────────────────────────────────

@router.post("/")
def create_account(payload: AccountCreate):

    db = get_supabase()

    validate_platform(payload.platform)

    existing = (
        db.table("accounts")
        .select("id")
        .eq("identifier", payload.identifier)
        .execute()
    )

    if existing.data:

        raise HTTPException(
            status_code=400,
            detail="An account with this identifier already exists"
        )

    data = payload.dict()

    data["id"] = str(uuid.uuid4())

    data["platform"] = payload.platform.lower()

    data["created_at"] = datetime.utcnow().isoformat()

    data["is_active"] = True

    data["status"] = "healthy"

    data["is_test_mode"] = determine_test_mode(data)

    db.table("accounts").insert(data).execute()

    logger.info(
        f"Created account {data['name']} "
        f"({data['platform']})"
    )

    return {
        "message": "Account created",
        "account": mask_sensitive_fields(data)
    }


# ─────────────────────────────────────────────────────────────
# UPDATE ACCOUNT
# ─────────────────────────────────────────────────────────────

@router.patch("/{account_id}")
def update_account(
    account_id: str,
    payload: dict
):

    db = get_supabase()

    existing = (
        db.table("accounts")
        .select("*")
        .eq("id", account_id)
        .single()
        .execute()
    )

    if not existing.data:

        raise HTTPException(
            status_code=404,
            detail="Account not found"
        )

    if "platform" in payload:

        validate_platform(payload["platform"])

    payload["updated_at"] = datetime.utcnow().isoformat()

    merged = {
        **existing.data,
        **payload
    }

    payload["is_test_mode"] = determine_test_mode(merged)

    db.table("accounts").update(payload).eq(
        "id",
        account_id
    ).execute()

    logger.info(
        f"Updated account {account_id}"
    )

    return {
        "updated": account_id
    }


# ─────────────────────────────────────────────────────────────
# ACTIVATE ACCOUNT
# ─────────────────────────────────────────────────────────────

@router.patch("/{account_id}/activate")
def activate_account(account_id: str):

    db = get_supabase()

    db.table("accounts").update({
        "is_active": True,
        "status": "healthy"
    }).eq("id", account_id).execute()

    return {
        "account_id": account_id,
        "status": "active"
    }


# ─────────────────────────────────────────────────────────────
# DEACTIVATE ACCOUNT
# ─────────────────────────────────────────────────────────────

@router.patch("/{account_id}/deactivate")
def deactivate_account(account_id: str):

    db = get_supabase()

    db.table("accounts").update({
        "is_active": False,
        "status": "inactive"
    }).eq("id", account_id).execute()

    return {
        "account_id": account_id,
        "status": "inactive"
    }


# ─────────────────────────────────────────────────────────────
# DELETE ACCOUNT
# ─────────────────────────────────────────────────────────────

@router.delete("/{account_id}")
def delete_account(account_id: str):

    db = get_supabase()

    account = (
        db.table("accounts")
        .select("*")
        .eq("id", account_id)
        .single()
        .execute()
    )

    if not account.data:

        raise HTTPException(
            status_code=404,
            detail="Account not found"
        )

    db.table("accounts").delete().eq(
        "id",
        account_id
    ).execute()

    logger.info(
        f"Deleted account {account_id}"
    )

    return {
        "deleted": account_id
    }


# ─────────────────────────────────────────────────────────────
# ACCOUNT HEALTH CHECK
# ─────────────────────────────────────────────────────────────

@router.get("/{account_id}/health")
async def account_health(account_id: str):

    db = get_supabase()

    result = (
        db.table("accounts")
        .select("*")
        .eq("id", account_id)
        .single()
        .execute()
    )

    account = result.data

    if not account:

        raise HTTPException(
            status_code=404,
            detail="Account not found"
        )

    status = "healthy"

    issues = []

    if not account.get("is_active"):

        status = "inactive"

        issues.append(
            "Account is disabled"
        )

    if account.get("is_test_mode"):

        issues.append(
            "Running in test mode"
        )

    return {
        "account_id": account_id,
        "status": status,
        "platform": account.get("platform"),
        "is_test_mode": account.get("is_test_mode"),
        "issues": issues,
    }


# ─────────────────────────────────────────────────────────────
# TEST ACCOUNT
# ─────────────────────────────────────────────────────────────

@router.post("/{account_id}/test")
async def test_account(account_id: str):

    db = get_supabase()

    result = (
        db.table("accounts")
        .select("*")
        .eq("id", account_id)
        .single()
        .execute()
    )

    account = result.data

    if not account:

        raise HTTPException(
            status_code=404,
            detail="Account not found"
        )

    from services.messaging_service import send_message

    try:

        test_result = await send_message(
            to=account["identifier"],
            message="TransMsg test message — account connected successfully.",
            account=account,
            test_mode=account.get("is_test_mode", True),
        )

        db.table("accounts").update({
            "last_tested_at": datetime.utcnow().isoformat(),
            "last_test_success": test_result.get("success", False),
            "status": (
                "healthy"
                if test_result.get("success")
                else "error"
            )
        }).eq("id", account_id).execute()

        return {
            "account_id": account_id,
            "platform": account.get("platform"),
            "test_mode": account.get("is_test_mode"),
            "result": test_result
        }

    except Exception as e:

        logger.error(
            f"Account test failed: {e}"
        )

        db.table("accounts").update({
            "status": "error"
        }).eq("id", account_id).execute()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ─────────────────────────────────────────────────────────────
# ACCOUNT STATS
# ─────────────────────────────────────────────────────────────

@router.get("/{account_id}/stats")
def account_stats(account_id: str):

    db = get_supabase()

    logs = (
        db.table("delivery_logs")
        .select("*")
        .eq("account_id", account_id)
        .execute()
    ).data or []

    delivered = len([
        l for l in logs
        if l.get("status") == "delivered"
    ])

    failed = len([
        l for l in logs
        if l.get("status") == "failed"
    ])

    total = delivered + failed

    success_rate = (
        round((delivered / total) * 100, 1)
        if total
        else 0
    )

    return {
        "account_id": account_id,
        "total_sent": total,
        "delivered": delivered,
        "failed": failed,
        "success_rate": success_rate,
    }