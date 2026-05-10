from fastapi import APIRouter
from core.config import get_supabase

router = APIRouter(prefix="/analytics", tags=["analytics"])
templates_router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/overview")
def overview():
    db = get_supabase()
    campaigns = db.table("campaigns").select("total_sent, total_delivered, total_failed, status").execute().data
    total_sent = sum(c.get("total_sent") or 0 for c in campaigns)
    total_delivered = sum(c.get("total_delivered") or 0 for c in campaigns)
    total_failed = sum(c.get("total_failed") or 0 for c in campaigns)
    active = sum(1 for c in campaigns if c.get("status") == "running")
    rate = round(total_delivered / total_sent * 100, 2) if total_sent else 0
    lists = db.table("recipient_lists").select("valid_count").execute().data
    total_contacts = sum(l.get("valid_count") or 0 for l in lists)
    return {
        "total_sent": total_sent,
        "total_delivered": total_delivered,
        "total_failed": total_failed,
        "delivery_rate": rate,
        "active_campaigns": active,
        "total_campaigns": len(campaigns),
        "total_contacts": total_contacts,
    }


@router.get("/delivery-logs")
def delivery_logs(campaign_id: str = None, limit: int = 50):
    db = get_supabase()
    q = db.table("delivery_logs").select("*").order("created_at", desc=True).limit(limit)
    if campaign_id:
        q = q.eq("campaign_id", campaign_id)
    return q.execute().data


# ── Templates ─────────────────────────────────────────────────────────────────

@templates_router.get("/")
def list_templates():
    db = get_supabase()
    return db.table("templates").select("*").eq("is_active", True).execute().data


@templates_router.post("/")
def create_template(payload: dict):
    db = get_supabase()
    import uuid
    payload["id"] = str(uuid.uuid4())
    db.table("templates").insert(payload).execute()
    return payload


@templates_router.delete("/{template_id}")
def delete_template(template_id: str):
    db = get_supabase()
    db.table("templates").update({"is_active": False}).eq("id", template_id).execute()
    return {"deleted": template_id}
