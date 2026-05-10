from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel
from core.config import get_supabase
from services.number_service import (
    parse_numbers_from_csv, parse_numbers_from_text, process_numbers
)
import uuid

router = APIRouter(prefix="/recipients", tags=["recipients"])


class PasteNumbersRequest(BaseModel):
    name: str
    text: str


@router.post("/upload-file")
async def upload_file(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload CSV or Excel file of phone numbers."""
    allowed = [".csv", ".xlsx", ".xls"]
    suffix = "." + file.filename.split(".")[-1].lower()
    if suffix not in allowed:
        raise HTTPException(400, "Only CSV and Excel files are supported")

    contents = await file.read()
    try:
        raw_numbers = parse_numbers_from_csv(contents, file.filename)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return await _process_and_save(name, raw_numbers, background_tasks)


@router.post("/paste")
async def paste_numbers(payload: PasteNumbersRequest, background_tasks: BackgroundTasks):
    """Accept pasted phone numbers (one per line or comma-separated)."""
    raw_numbers = parse_numbers_from_text(payload.text)
    if not raw_numbers:
        raise HTTPException(400, "No phone numbers found in the provided text")
    return await _process_and_save(payload.name, raw_numbers, background_tasks)


async def _process_and_save(name: str, raw_numbers: list, background_tasks: BackgroundTasks):
    """Validate numbers and save to Supabase."""
    db = get_supabase()

    # Process numbers
    result = process_numbers(raw_numbers)

    # Create recipient list record
    list_id = str(uuid.uuid4())
    db.table("recipient_lists").insert({
        "id": list_id,
        "name": name,
        "total_count": result["total_raw"],
        "valid_count": result["valid_count"],
        "invalid_count": result["invalid_count"],
        "duplicate_count": result["duplicate_count"],
        "status": "processing",
    }).execute()

    # Save valid numbers in background
    background_tasks.add_task(_save_recipients, list_id, result["valid"], db)

    return {
        "list_id": list_id,
        "name": name,
        "total_raw": result["total_raw"],
        "valid_count": result["valid_count"],
        "invalid_count": result["invalid_count"],
        "duplicate_count": result["duplicate_count"],
        "invalid_samples": result["invalid"][:10],
        "status": "processing",
    }


async def _save_recipients(list_id: str, valid_numbers: list, db):
    """Save recipients in batches of 500."""
    batch_size = 500
    for i in range(0, len(valid_numbers), batch_size):
        batch = valid_numbers[i:i + batch_size]
        rows = [{"list_id": list_id, "phone_number": num, "is_valid": True} for num in batch]
        db.table("recipients").insert(rows).execute()

    # Mark list as ready
    db.table("recipient_lists").update({"status": "ready"}).eq("id", list_id).execute()


@router.get("/lists")
def get_lists():
    db = get_supabase()
    result = db.table("recipient_lists").select("*").order("created_at", desc=True).execute()
    return result.data


@router.get("/lists/{list_id}")
def get_list(list_id: str):
    db = get_supabase()
    lst = db.table("recipient_lists").select("*").eq("id", list_id).single().execute()
    return lst.data


@router.delete("/lists/{list_id}")
def delete_list(list_id: str):
    db = get_supabase()
    db.table("recipients").delete().eq("list_id", list_id).execute()
    db.table("recipient_lists").delete().eq("id", list_id).execute()
    return {"deleted": list_id}
