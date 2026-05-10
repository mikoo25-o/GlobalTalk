from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from core.config import get_supabase, get_settings
from services.number_service import split_numbers_across_accounts
from services.messaging_service import send_batch
from services.translation_service import translate_to_all
import uuid, asyncio, logging
from datetime import datetime

router = APIRouter(prefix="/campaigns", tags=["campaigns"])
logger = logging.getLogger(__name__)


class CampaignCreate(BaseModel):
    name: str
    message_body: str
    template_name: Optional[str] = None
    recipient_list_id: str
    languages: List[str] = ["en"]
    rate_per_minute: int = 1000
    scheduled_at: Optional[str] = None
    optin_only: bool = True
    test_mode: bool = True


@router.get("/")
def list_campaigns():
    db = get_supabase()
    return db.table("campaigns").select("*, recipient_lists(name, valid_count)").order("created_at", desc=True).execute().data


@router.get("/{campaign_id}")
def get_campaign(campaign_id: str):
    db = get_supabase()
    campaign = db.table("campaigns").select("*").eq("id", campaign_id).single().execute().data
    assignments = db.table("campaign_assignments").select("*, accounts(name, platform, identifier)").eq("campaign_id", campaign_id).execute().data
    return {"campaign": campaign, "assignments": assignments}


@router.get("/{campaign_id}/progress")
def get_progress(campaign_id: str):
    """Real-time progress for a running campaign."""
    db = get_supabase()
    campaign = db.table("campaigns").select("*").eq("id", campaign_id).single().execute().data
    assignments = db.table("campaign_assignments").select("*, accounts(name, platform, identifier)").eq("campaign_id", campaign_id).execute().data

    total_sent = sum(a.get("sent_count", 0) for a in assignments)
    total_delivered = sum(a.get("delivered_count", 0) for a in assignments)
    total_failed = sum(a.get("failed_count", 0) for a in assignments)
    total_recipients = campaign.get("total_recipients", 1)
    pct = round((total_sent / total_recipients * 100), 1) if total_recipients else 0

    return {
        "campaign_id": campaign_id,
        "status": campaign.get("status"),
        "total_recipients": total_recipients,
        "total_sent": total_sent,
        "total_delivered": total_delivered,
        "total_failed": total_failed,
        "progress_pct": pct,
        "assignments": [
            {
                "account_name": a.get("accounts", {}).get("name", ""),
                "account_platform": a.get("accounts", {}).get("platform", ""),
                "account_id": a.get("account_id"),
                "recipient_count": a.get("recipient_count", 0),
                "sent_count": a.get("sent_count", 0),
                "delivered_count": a.get("delivered_count", 0),
                "failed_count": a.get("failed_count", 0),
                "status": a.get("status"),
                "pct": round(a.get("sent_count", 0) / max(a.get("recipient_count", 1), 1) * 100, 1),
            }
            for a in assignments
        ],
    }


@router.post("/")
async def create_campaign(payload: CampaignCreate, background_tasks: BackgroundTasks):
    db = get_supabase()

    # Validate recipient list exists and is ready
    lst = db.table("recipient_lists").select("*").eq("id", payload.recipient_list_id).single().execute().data
    if not lst:
        raise HTTPException(404, "Recipient list not found")
    if lst["status"] != "ready":
        raise HTTPException(400, f"Recipient list status is '{lst['status']}' — wait for processing to complete")

    # Get active accounts
    accounts = db.table("accounts").select("*").eq("is_active", True).execute().data
    if not accounts:
        raise HTTPException(400, "No active accounts. Add at least one account first.")

    # Pre-translate message
    translations = await translate_to_all(payload.message_body, payload.languages)

    # Create campaign
    campaign_id = str(uuid.uuid4())
    campaign_data = {
        "id": campaign_id,
        "name": payload.name,
        "message_body": payload.message_body,
        "template_name": payload.template_name,
        "recipient_list_id": payload.recipient_list_id,
        "languages": payload.languages,
        "rate_per_minute": payload.rate_per_minute,
        "optin_only": payload.optin_only,
        "test_mode": payload.test_mode,
        "total_recipients": lst["valid_count"],
        "status": "scheduled" if payload.scheduled_at else "draft",
        "scheduled_at": payload.scheduled_at,
    }
    db.table("campaigns").insert(campaign_data).execute()

    return {
        "campaign_id": campaign_id,
        "name": payload.name,
        "total_recipients": lst["valid_count"],
        "accounts_available": len(accounts),
        "split_preview": f"{lst['valid_count']} numbers ÷ {len(accounts)} accounts = ~{lst['valid_count'] // len(accounts):,} per account",
        "translations": {k: v[:80] + "..." if len(v) > 80 else v for k, v in translations.items()},
        "status": campaign_data["status"],
    }


@router.post("/{campaign_id}/launch")
async def launch_campaign(campaign_id: str, background_tasks: BackgroundTasks):
    """
    Launch campaign:
    1. Load all valid recipient numbers
    2. Auto-split across active accounts
    3. Create assignment records
    4. Fire off parallel sending tasks
    """
    db = get_supabase()
    settings = get_settings()

    campaign = db.table("campaigns").select("*").eq("id", campaign_id).single().execute().data
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    if campaign["status"] == "running":
        raise HTTPException(400, "Campaign is already running")

    # Load accounts
    accounts = db.table("accounts").select("*").eq("is_active", True).execute().data
    if not accounts:
        raise HTTPException(400, "No active sending accounts")

    # Load all valid numbers for this list
    numbers_result = db.table("recipients")\
        .select("phone_number")\
        .eq("list_id", campaign["recipient_list_id"])\
        .eq("is_valid", True)\
        .eq("is_opted_out", False)\
        .execute()
    numbers = [r["phone_number"] for r in numbers_result.data]

    if not numbers:
        raise HTTPException(400, "No valid recipients in this list")

    # Auto-split numbers across accounts
    assignments = split_numbers_across_accounts(numbers, accounts)

    # Create assignment records in DB
    assignment_ids = []
    for asn in assignments:
        asn_id = str(uuid.uuid4())
        db.table("campaign_assignments").insert({
            "id": asn_id,
            "campaign_id": campaign_id,
            "account_id": asn["account_id"],
            "assigned_from": asn["from_idx"],
            "assigned_to": asn["to_idx"],
            "recipient_count": asn["count"],
            "status": "pending",
        }).execute()
        asn["assignment_id"] = asn_id
        assignment_ids.append(asn_id)

    # Mark campaign as running
    db.table("campaigns").update({
        "status": "running",
        "started_at": datetime.utcnow().isoformat(),
    }).eq("id", campaign_id).execute()

    # Fire all account batches simultaneously in background
    background_tasks.add_task(
        _run_all_assignments,
        campaign_id, assignments, campaign["message_body"],
        campaign["rate_per_minute"], campaign["test_mode"], db
    )

    return {
        "campaign_id": campaign_id,
        "status": "running",
        "total_numbers": len(numbers),
        "accounts_used": len(assignments),
        "assignments": [
            {
                "account": a["account"]["name"],
                "platform": a["account"]["platform"],
                "numbers_assigned": a["count"],
                "from": a["from_idx"],
                "to": a["to_idx"],
            }
            for a in assignments
        ],
    }


async def _run_all_assignments(campaign_id, assignments, message, rate_per_minute, test_mode, db):
    """Run all account assignments simultaneously using asyncio.gather."""
    tasks = []
    for asn in assignments:
        task = send_batch(
            numbers=asn["numbers"],
            message=message,
            account=asn["account"],
            assignment_id=asn["assignment_id"],
            campaign_id=campaign_id,
            supabase=db,
            rate_per_minute=rate_per_minute,
            test_mode=test_mode,
        )
        tasks.append(task)

    # All accounts send simultaneously
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Mark campaign completed
    total_delivered = sum(r.get("delivered", 0) for r in results if isinstance(r, dict))
    total_failed = sum(r.get("failed", 0) for r in results if isinstance(r, dict))

    db.table("campaigns").update({
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat(),
        "total_delivered": total_delivered,
        "total_failed": total_failed,
        "total_sent": total_delivered + total_failed,
    }).eq("id", campaign_id).execute()


@router.patch("/{campaign_id}/pause")
def pause_campaign(campaign_id: str):
    db = get_supabase()
    db.table("campaigns").update({"status": "paused"}).eq("id", campaign_id).execute()
    db.table("campaign_assignments").update({"status": "paused"})\
        .eq("campaign_id", campaign_id).eq("status", "running").execute()
    return {"status": "paused"}


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: str):
    db = get_supabase()
    db.table("campaign_assignments").delete().eq("campaign_id", campaign_id).execute()
    db.table("delivery_logs").delete().eq("campaign_id", campaign_id).execute()
    db.table("campaigns").delete().eq("id", campaign_id).execute()
    return {"deleted": campaign_id}
