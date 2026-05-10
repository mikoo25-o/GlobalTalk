from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.config import get_supabase
import uuid

router = APIRouter(prefix="/accounts", tags=["accounts"])


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


@router.get("/")
def list_accounts():
    db = get_supabase()
    result = db.table("accounts").select("*").order("created_at").execute()
    return result.data


@router.post("/")
def create_account(payload: AccountCreate):
    db = get_supabase()
    if payload.platform not in ("whatsapp", "telegram", "sms"):
        raise HTTPException(400, "Platform must be whatsapp, telegram, or sms")
    data = payload.dict()
    data["id"] = str(uuid.uuid4())
    # Determine if test mode based on whether keys are provided
    if payload.platform == "whatsapp" and payload.access_token and payload.phone_number_id:
        data["is_test_mode"] = False
    elif payload.platform == "sms" and payload.twilio_sid and payload.twilio_token:
        data["is_test_mode"] = False
    elif payload.platform == "telegram" and payload.bot_token:
        data["is_test_mode"] = False
    db.table("accounts").insert(data).execute()
    return data


@router.patch("/{account_id}")
def update_account(account_id: str, payload: dict):
    db = get_supabase()
    db.table("accounts").update(payload).eq("id", account_id).execute()
    return {"updated": account_id}


@router.delete("/{account_id}")
def delete_account(account_id: str):
    db = get_supabase()
    db.table("accounts").delete().eq("id", account_id).execute()
    return {"deleted": account_id}


@router.post("/{account_id}/test")
async def test_account(account_id: str):
    """Send a test message to verify account credentials."""
    db = get_supabase()
    result = db.table("accounts").select("*").eq("id", account_id).single().execute()
    account = result.data
    if not account:
        raise HTTPException(404, "Account not found")

    from services.messaging_service import send_message
    # Always send to a test number
    test_result = await send_message(
        to=account["identifier"],
        message="TransMsg test message — your account is connected!",
        account=account,
        test_mode=account["is_test_mode"],
    )
    return {"account_id": account_id, "result": test_result}
