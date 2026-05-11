from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from core.config import get_supabase, get_settings
from services.number_service import split_numbers_across_accounts
from services.messaging_service import send_batch
from services.translation_service import translate_to_all

import uuid
import asyncio
import logging

from datetime import datetime

router = APIRouter(
    prefix="/campaigns",
    tags=["campaigns"]
)

logger = logging.getLogger(__name__)


# =========================================================
# MODELS
# =========================================================

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


# =========================================================
# HELPERS
# =========================================================

def calculate_progress(total_sent: int, total_recipients: int):
    if total_recipients <= 0:
        return 0

    return round((total_sent / total_recipients) * 100, 1)


# =========================================================
# LIST CAMPAIGNS
# =========================================================

@router.get("/")
def list_campaigns():

    db = get_supabase()

    campaigns = (
        db.table("campaigns")
        .select("*, recipient_lists(name, valid_count)")
        .order("created_at", desc=True)
        .execute()
        .data
    )

    return campaigns


# =========================================================
# GET SINGLE CAMPAIGN
# =========================================================

@router.get("/{campaign_id}")
def get_campaign(campaign_id: str):

    db = get_supabase()

    campaign = (
        db.table("campaigns")
        .select("*")
        .eq("id", campaign_id)
        .single()
        .execute()
        .data
    )

    if not campaign:
        raise HTTPException(404, "Campaign not found")

    assignments = (
        db.table("campaign_assignments")
        .select("*, accounts(name, platform, identifier)")
        .eq("campaign_id", campaign_id)
        .execute()
        .data
    )

    return {
        "campaign": campaign,
        "assignments": assignments
    }


# =========================================================
# REAL TIME PROGRESS
# =========================================================

@router.get("/{campaign_id}/progress")
def get_progress(campaign_id: str):

    db = get_supabase()

    campaign = (
        db.table("campaigns")
        .select("*")
        .eq("id", campaign_id)
        .single()
        .execute()
        .data
    )

    if not campaign:
        raise HTTPException(404, "Campaign not found")

    assignments = (
        db.table("campaign_assignments")
        .select("*, accounts(name, platform, identifier)")
        .eq("campaign_id", campaign_id)
        .execute()
        .data
    )

    total_sent = sum(a.get("sent_count", 0) for a in assignments)
    total_delivered = sum(a.get("delivered_count", 0) for a in assignments)
    total_failed = sum(a.get("failed_count", 0) for a in assignments)

    total_recipients = campaign.get("total_recipients", 0)

    pct = calculate_progress(
        total_sent,
        total_recipients
    )

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
                "assignment_id": a.get("id"),

                "account_name": a.get("accounts", {}).get("name", ""),
                "account_platform": a.get("accounts", {}).get("platform", ""),
                "account_identifier": a.get("accounts", {}).get("identifier", ""),

                "account_id": a.get("account_id"),

                "recipient_count": a.get("recipient_count", 0),

                "sent_count": a.get("sent_count", 0),
                "delivered_count": a.get("delivered_count", 0),
                "failed_count": a.get("failed_count", 0),

                "status": a.get("status"),

                "pct": calculate_progress(
                    a.get("sent_count", 0),
                    max(a.get("recipient_count", 1), 1)
                )
            }
            for a in assignments
        ]
    }


# =========================================================
# CREATE CAMPAIGN
# =========================================================

@router.post("/")
async def create_campaign(
    payload: CampaignCreate,
    background_tasks: BackgroundTasks
):

    db = get_supabase()

    # -----------------------------------------------------
    # VALIDATE LIST
    # -----------------------------------------------------

    recipient_list = (
        db.table("recipient_lists")
        .select("*")
        .eq("id", payload.recipient_list_id)
        .single()
        .execute()
        .data
    )

    if not recipient_list:
        raise HTTPException(
            404,
            "Recipient list not found"
        )

    if recipient_list["status"] != "ready":
        raise HTTPException(
            400,
            f"Recipient list status is '{recipient_list['status']}'"
        )

    # -----------------------------------------------------
    # ACTIVE ACCOUNTS
    # -----------------------------------------------------

    accounts = (
        db.table("accounts")
        .select("*")
        .eq("is_active", True)
        .execute()
        .data
    )

    if not accounts:
        raise HTTPException(
            400,
            "No active accounts. Add at least one account first."
        )

    # -----------------------------------------------------
    # TRANSLATIONS
    # -----------------------------------------------------

    translations = await translate_to_all(
        payload.message_body,
        payload.languages
    )

    # -----------------------------------------------------
    # CREATE CAMPAIGN
    # -----------------------------------------------------

    campaign_id = str(uuid.uuid4())

    campaign_data = {
        "id": campaign_id,

        "name": payload.name,
        "message_body": payload.message_body,

        "template_name": payload.template_name,

        "recipient_list_id": payload.recipient_list_id,

        "languages": payload.languages,

        "rate_per_minute": payload.rate_per_minute,

        "scheduled_at": payload.scheduled_at,

        "optin_only": payload.optin_only,
        "test_mode": payload.test_mode,

        "total_recipients": recipient_list["valid_count"],

        "status": (
            "scheduled"
            if payload.scheduled_at
            else "draft"
        ),

        "created_at": datetime.utcnow().isoformat()
    }

    db.table("campaigns").insert(campaign_data).execute()

    # -----------------------------------------------------
    # OPTIONAL AUTO SCHEDULE
    # -----------------------------------------------------

    if payload.scheduled_at:
        logger.info(
            f"Campaign {campaign_id} scheduled for {payload.scheduled_at}"
        )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "campaign_id": campaign_id,

        "name": payload.name,

        "status": campaign_data["status"],

        "total_recipients": recipient_list["valid_count"],

        "accounts_available": len(accounts),

        "split_preview": (
            f"{recipient_list['valid_count']} numbers ÷ "
            f"{len(accounts)} accounts = "
            f"~{recipient_list['valid_count'] // len(accounts):,} per account"
        ),

        "translations": {
            k: (
                v[:80] + "..."
                if len(v) > 80
                else v
            )
            for k, v in translations.items()
        }
    }


# =========================================================
# LAUNCH CAMPAIGN
# =========================================================

@router.post("/{campaign_id}/launch")
async def launch_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks
):

    db = get_supabase()
    settings = get_settings()

    # -----------------------------------------------------
    # LOAD CAMPAIGN
    # -----------------------------------------------------

    campaign = (
        db.table("campaigns")
        .select("*")
        .eq("id", campaign_id)
        .single()
        .execute()
        .data
    )

    if not campaign:
        raise HTTPException(
            404,
            "Campaign not found"
        )

    if campaign["status"] == "running":
        raise HTTPException(
            400,
            "Campaign is already running"
        )

    # -----------------------------------------------------
    # LOAD ACTIVE ACCOUNTS
    # -----------------------------------------------------

    accounts = (
        db.table("accounts")
        .select("*")
        .eq("is_active", True)
        .execute()
        .data
    )

    if not accounts:
        raise HTTPException(
            400,
            "No active sending accounts"
        )

    # -----------------------------------------------------
    # LOAD RECIPIENTS
    # -----------------------------------------------------

    recipients_query = (
        db.table("recipients")
        .select("phone_number")

        .eq("list_id", campaign["recipient_list_id"])

        .eq("is_valid", True)
    )

    if campaign.get("optin_only", True):
        recipients_query = recipients_query.eq(
            "is_opted_out",
            False
        )

    recipients = recipients_query.execute().data

    numbers = [
        r["phone_number"]
        for r in recipients
    ]

    if not numbers:
        raise HTTPException(
            400,
            "No valid recipients in this list"
        )

    # -----------------------------------------------------
    # SPLIT NUMBERS
    # -----------------------------------------------------

    assignments = split_numbers_across_accounts(
        numbers,
        accounts
    )

    # -----------------------------------------------------
    # CREATE ASSIGNMENTS
    # -----------------------------------------------------

    for assignment in assignments:

        assignment_id = str(uuid.uuid4())

        db.table("campaign_assignments").insert({
            "id": assignment_id,

            "campaign_id": campaign_id,

            "account_id": assignment["account_id"],

            "assigned_from": assignment["from_idx"],
            "assigned_to": assignment["to_idx"],

            "recipient_count": assignment["count"],

            "sent_count": 0,
            "delivered_count": 0,
            "failed_count": 0,

            "status": "pending",

            "created_at": datetime.utcnow().isoformat()
        }).execute()

        assignment["assignment_id"] = assignment_id

    # -----------------------------------------------------
    # MARK RUNNING
    # -----------------------------------------------------

    db.table("campaigns").update({
        "status": "running",
        "started_at": datetime.utcnow().isoformat()
    }).eq("id", campaign_id).execute()

    # -----------------------------------------------------
    # BACKGROUND SEND
    # -----------------------------------------------------

    background_tasks.add_task(
        _run_all_assignments,

        campaign_id,

        assignments,

        campaign["message_body"],

        campaign["rate_per_minute"],

        campaign["test_mode"],

        db
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

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
                "to": a["to_idx"]
            }
            for a in assignments
        ]
    }


# =========================================================
# SEND ALL ASSIGNMENTS
# =========================================================

async def _run_all_assignments(
    campaign_id,
    assignments,
    message,
    rate_per_minute,
    test_mode,
    db
):

    tasks = []

    for assignment in assignments:

        task = send_batch(
            numbers=assignment["numbers"],

            message=message,

            account=assignment["account"],

            assignment_id=assignment["assignment_id"],

            campaign_id=campaign_id,

            supabase=db,

            rate_per_minute=rate_per_minute,

            test_mode=test_mode
        )

        tasks.append(task)

    # -----------------------------------------------------
    # RUN ALL ACCOUNTS SIMULTANEOUSLY
    # -----------------------------------------------------

    results = await asyncio.gather(
        *tasks,
        return_exceptions=True
    )

    total_delivered = 0
    total_failed = 0

    for result in results:

        if isinstance(result, dict):

            total_delivered += result.get("delivered", 0)
            total_failed += result.get("failed", 0)

        elif isinstance(result, Exception):

            logger.error(
                f"Campaign task error: {str(result)}"
            )

    # -----------------------------------------------------
    # COMPLETE CAMPAIGN
    # -----------------------------------------------------

    final_status = (
        "completed"
        if total_failed == 0
        else "completed"
    )

    db.table("campaigns").update({
        "status": final_status,

        "completed_at": datetime.utcnow().isoformat(),

        "total_delivered": total_delivered,
        "total_failed": total_failed,

        "total_sent": total_delivered + total_failed
    }).eq("id", campaign_id).execute()


# =========================================================
# PAUSE CAMPAIGN
# =========================================================

@router.patch("/{campaign_id}/pause")
def pause_campaign(campaign_id: str):

    db = get_supabase()

    db.table("campaigns").update({
        "status": "paused"
    }).eq("id", campaign_id).execute()

    db.table("campaign_assignments").update({
        "status": "paused"
    }).eq(
        "campaign_id",
        campaign_id
    ).eq(
        "status",
        "running"
    ).execute()

    return {
        "status": "paused"
    }


# =========================================================
# CANCEL CAMPAIGN
# =========================================================

@router.patch("/{campaign_id}/cancel")
def cancel_campaign(campaign_id: str):

    db = get_supabase()

    db.table("campaigns").update({
        "status": "cancelled"
    }).eq("id", campaign_id).execute()

    db.table("campaign_assignments").update({
        "status": "cancelled"
    }).eq(
        "campaign_id",
        campaign_id
    ).execute()

    return {
        "status": "cancelled"
    }


# =========================================================
# DUPLICATE CAMPAIGN
# =========================================================

@router.post("/{campaign_id}/duplicate")
def duplicate_campaign(campaign_id: str):

    db = get_supabase()

    original = (
        db.table("campaigns")
        .select("*")
        .eq("id", campaign_id)
        .single()
        .execute()
        .data
    )

    if not original:
        raise HTTPException(
            404,
            "Campaign not found"
        )

    new_id = str(uuid.uuid4())

    duplicated = {
        **original,

        "id": new_id,

        "name": f"{original['name']} Copy",

        "status": "draft",

        "started_at": None,
        "completed_at": None,

        "total_sent": 0,
        "total_failed": 0,
        "total_delivered": 0,

        "created_at": datetime.utcnow().isoformat()
    }

    db.table("campaigns").insert(duplicated).execute()

    return {
        "campaign_id": new_id,
        "status": "draft"
    }


# =========================================================
# RETRY FAILED
# =========================================================

@router.post("/{campaign_id}/retry-failed")
def retry_failed_campaign(campaign_id: str):

    db = get_supabase()

    db.table("campaigns").update({
        "status": "draft"
    }).eq("id", campaign_id).execute()

    return {
        "status": "draft",
        "message": "Campaign reset and ready to relaunch"
    }


# =========================================================
# DELETE CAMPAIGN
# =========================================================

@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: str):

    db = get_supabase()

    db.table("campaign_assignments")\
        .delete()\
        .eq("campaign_id", campaign_id)\
        .execute()

    db.table("delivery_logs")\
        .delete()\
        .eq("campaign_id", campaign_id)\
        .execute()

    db.table("campaigns")\
        .delete()\
        .eq("id", campaign_id)\
        .execute()

    return {
        "deleted": campaign_id
    }