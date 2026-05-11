from fastapi import APIRouter, HTTPException
from typing import Optional
from datetime import datetime, timedelta
import uuid
import logging

from core.config import get_supabase

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

templates_router = APIRouter(
    prefix="/templates",
    tags=["templates"]
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# OVERVIEW DASHBOARD
# ─────────────────────────────────────────────────────────────

@router.get("/overview")
def overview():

    db = get_supabase()

    campaigns = (
        db.table("campaigns")
        .select("*")
        .execute()
        .data
    ) or []

    total_sent = sum(
        c.get("total_sent") or 0
        for c in campaigns
    )

    total_delivered = sum(
        c.get("total_delivered") or 0
        for c in campaigns
    )

    total_failed = sum(
        c.get("total_failed") or 0
        for c in campaigns
    )

    delivery_rate = (
        round((total_delivered / total_sent) * 100, 2)
        if total_sent
        else 0
    )

    active_campaigns = len([
        c for c in campaigns
        if c.get("status") == "running"
    ])

    completed_campaigns = len([
        c for c in campaigns
        if c.get("status") == "completed"
    ])

    failed_campaigns = len([
        c for c in campaigns
        if c.get("status") == "failed"
    ])

    paused_campaigns = len([
        c for c in campaigns
        if c.get("status") == "paused"
    ])

    lists = (
        db.table("recipient_lists")
        .select("valid_count")
        .execute()
        .data
    ) or []

    total_contacts = sum(
        l.get("valid_count") or 0
        for l in lists
    )

    accounts = (
        db.table("accounts")
        .select("*")
        .execute()
        .data
    ) or []

    active_accounts = len([
        a for a in accounts
        if a.get("is_active")
    ])

    return {
        "total_sent": total_sent,
        "total_delivered": total_delivered,
        "total_failed": total_failed,
        "delivery_rate": delivery_rate,
        "active_campaigns": active_campaigns,
        "completed_campaigns": completed_campaigns,
        "failed_campaigns": failed_campaigns,
        "paused_campaigns": paused_campaigns,
        "total_campaigns": len(campaigns),
        "total_contacts": total_contacts,
        "active_accounts": active_accounts,
        "total_accounts": len(accounts),
    }


# ─────────────────────────────────────────────────────────────
# DELIVERY LOGS
# ─────────────────────────────────────────────────────────────

@router.get("/delivery-logs")
def delivery_logs(
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50
):

    db = get_supabase()

    query = (
        db.table("delivery_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
    )

    if campaign_id:

        query = query.eq(
            "campaign_id",
            campaign_id
        )

    if status:

        query = query.eq(
            "status",
            status
        )

    results = query.execute().data or []

    return {
        "count": len(results),
        "logs": results
    }


# ─────────────────────────────────────────────────────────────
# CAMPAIGN ANALYTICS
# ─────────────────────────────────────────────────────────────

@router.get("/campaigns/{campaign_id}")
def campaign_analytics(campaign_id: str):

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

        raise HTTPException(
            status_code=404,
            detail="Campaign not found"
        )

    assignments = (
        db.table("campaign_assignments")
        .select("*")
        .eq("campaign_id", campaign_id)
        .execute()
        .data
    ) or []

    delivered = campaign.get("total_delivered") or 0

    failed = campaign.get("total_failed") or 0

    total = delivered + failed

    success_rate = (
        round((delivered / total) * 100, 2)
        if total
        else 0
    )

    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name"),
        "status": campaign.get("status"),
        "total_sent": total,
        "delivered": delivered,
        "failed": failed,
        "success_rate": success_rate,
        "assignments": len(assignments),
        "languages": campaign.get("languages", []),
        "test_mode": campaign.get("test_mode"),
    }


# ─────────────────────────────────────────────────────────────
# ACCOUNT ANALYTICS
# ─────────────────────────────────────────────────────────────

@router.get("/accounts")
def account_analytics():

    db = get_supabase()

    accounts = (
        db.table("accounts")
        .select("*")
        .execute()
        .data
    ) or []

    results = []

    for account in accounts:

        logs = (
            db.table("delivery_logs")
            .select("status")
            .eq("account_id", account["id"])
            .execute()
            .data
        ) or []

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

        results.append({
            "account_id": account["id"],
            "name": account.get("name"),
            "platform": account.get("platform"),
            "is_active": account.get("is_active"),
            "status": account.get("status"),
            "total_sent": total,
            "delivered": delivered,
            "failed": failed,
            "success_rate": success_rate,
        })

    return results


# ─────────────────────────────────────────────────────────────
# DELIVERY TRENDS
# ─────────────────────────────────────────────────────────────

@router.get("/trends/daily")
def daily_trends(days: int = 7):

    db = get_supabase()

    logs = (
        db.table("delivery_logs")
        .select("*")
        .execute()
        .data
    ) or []

    today = datetime.utcnow().date()

    trends = []

    for i in range(days):

        day = today - timedelta(days=i)

        delivered = 0

        failed = 0

        for log in logs:

            created = log.get("created_at")

            if not created:
                continue

            try:

                log_day = datetime.fromisoformat(
                    created.replace("Z", "")
                ).date()

            except Exception:
                continue

            if log_day != day:
                continue

            if log.get("status") == "delivered":
                delivered += 1

            elif log.get("status") == "failed":
                failed += 1

        trends.append({
            "date": str(day),
            "delivered": delivered,
            "failed": failed,
        })

    trends.reverse()

    return trends


# ─────────────────────────────────────────────────────────────
# RECENT ACTIVITY
# ─────────────────────────────────────────────────────────────

@router.get("/activity")
def recent_activity(limit: int = 20):

    db = get_supabase()

    logs = (
        db.table("delivery_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
        .data
    ) or []

    return logs


# ─────────────────────────────────────────────────────────────
# TEMPLATE LIST
# ─────────────────────────────────────────────────────────────

@templates_router.get("/")
def list_templates():

    db = get_supabase()

    templates = (
        db.table("templates")
        .select("*")
        .eq("is_active", True)
        .order("created_at", desc=True)
        .execute()
        .data
    ) or []

    return templates


# ─────────────────────────────────────────────────────────────
# CREATE TEMPLATE
# ─────────────────────────────────────────────────────────────

@templates_router.post("/")
def create_template(payload: dict):

    db = get_supabase()

    if not payload.get("name"):

        raise HTTPException(
            status_code=400,
            detail="Template name is required"
        )

    if not payload.get("body"):

        raise HTTPException(
            status_code=400,
            detail="Template body is required"
        )

    template = {
        "id": str(uuid.uuid4()),
        "name": payload["name"],
        "body": payload["body"],
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
    }

    db.table("templates").insert(
        template
    ).execute()

    logger.info(
        f"Created template {template['name']}"
    )

    return template


# ─────────────────────────────────────────────────────────────
# DELETE TEMPLATE
# ─────────────────────────────────────────────────────────────

@templates_router.delete("/{template_id}")
def delete_template(template_id: str):

    db = get_supabase()

    db.table("templates").update({
        "is_active": False
    }).eq(
        "id",
        template_id
    ).execute()

    logger.info(
        f"Archived template {template_id}"
    )

    return {
        "deleted": template_id
    }