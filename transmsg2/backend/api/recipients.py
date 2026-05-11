from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel
from core.config import get_supabase
from services.number_service import (
    parse_numbers_from_csv,
    parse_numbers_from_text,
    process_numbers
)

import uuid
import logging
from datetime import datetime

router = APIRouter(prefix="/recipients", tags=["recipients"])

logger = logging.getLogger(__name__)

MAX_UPLOAD_SIZE_MB = 15
ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"]


class PasteNumbersRequest(BaseModel):
    name: str
    text: str


@router.post("/upload-file")
async def upload_file(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Upload CSV or Excel file of phone numbers.
    """

    if not name.strip():
        raise HTTPException(400, "List name is required")

    suffix = "." + file.filename.split(".")[-1].lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400,
            "Only CSV and Excel files are supported"
        )

    contents = await file.read()

    file_size_mb = len(contents) / (1024 * 1024)

    if file_size_mb > MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            400,
            f"File exceeds {MAX_UPLOAD_SIZE_MB}MB limit"
        )

    try:
        raw_numbers = parse_numbers_from_csv(contents, file.filename)

    except ValueError as e:
        raise HTTPException(400, str(e))

    except Exception as e:
        logger.error(f"Failed to parse upload: {e}")
        raise HTTPException(500, "Failed to process uploaded file")

    return await _process_and_save(
        name=name.strip(),
        raw_numbers=raw_numbers,
        background_tasks=background_tasks,
    )


@router.post("/paste")
async def paste_numbers(
    payload: PasteNumbersRequest,
    background_tasks: BackgroundTasks
):
    """
    Accept pasted phone numbers.
    """

    if not payload.name.strip():
        raise HTTPException(400, "List name is required")

    raw_numbers = parse_numbers_from_text(payload.text)

    if not raw_numbers:
        raise HTTPException(
            400,
            "No phone numbers found in the provided text"
        )

    return await _process_and_save(
        name=payload.name.strip(),
        raw_numbers=raw_numbers,
        background_tasks=background_tasks,
    )


async def _process_and_save(
    name: str,
    raw_numbers: list,
    background_tasks: BackgroundTasks
):
    """
    Validate numbers, remove duplicates,
    and save recipient list.
    """

    db = get_supabase()

    if len(raw_numbers) == 0:
        raise HTTPException(400, "No numbers found")

    if len(raw_numbers) > 500000:
        raise HTTPException(
            400,
            "Maximum upload limit is 500,000 numbers"
        )

    try:
        # Process uploaded numbers
        result = process_numbers(raw_numbers)

        valid_numbers = result["valid"]

        # Remove duplicates already existing in database
        existing = (
            db.table("recipients")
            .select("phone_number")
            .in_("phone_number", valid_numbers[:10000])
            .execute()
            .data
        )

        existing_set = {
            x["phone_number"]
            for x in existing
        }

        filtered_valid = [
            n for n in valid_numbers
            if n not in existing_set
        ]

        existing_duplicate_count = (
            len(valid_numbers) - len(filtered_valid)
        )

        # Create recipient list
        list_id = str(uuid.uuid4())

        list_payload = {
            "id": list_id,
            "name": name,
            "total_count": result["total_raw"],
            "valid_count": len(filtered_valid),
            "invalid_count": result["invalid_count"],
            "duplicate_count": (
                result["duplicate_count"] +
                existing_duplicate_count
            ),
            "status": "processing",
            "created_at": datetime.utcnow().isoformat(),
        }

        db.table("recipient_lists").insert(
            list_payload
        ).execute()

        # Save recipients in background
        background_tasks.add_task(
            _save_recipients,
            list_id,
            filtered_valid,
            db
        )

        return {
            "list_id": list_id,
            "name": name,
            "total_raw": result["total_raw"],
            "valid_count": len(filtered_valid),
            "invalid_count": result["invalid_count"],
            "duplicate_count": (
                result["duplicate_count"] +
                existing_duplicate_count
            ),
            "invalid_samples": result["invalid"][:10],
            "status": "processing",
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Recipient processing failed: {e}")
        raise HTTPException(
            500,
            "Failed to process recipient list"
        )


async def _save_recipients(
    list_id: str,
    valid_numbers: list,
    db
):
    """
    Save recipients in batches.
    """

    batch_size = 500

    try:

        total_inserted = 0

        for i in range(0, len(valid_numbers), batch_size):

            batch = valid_numbers[i:i + batch_size]

            rows = [
                {
                    "list_id": list_id,
                    "phone_number": num,
                    "is_valid": True,
                    "is_opted_out": False,
                    "created_at": datetime.utcnow().isoformat(),
                }
                for num in batch
            ]

            db.table("recipients").insert(rows).execute()

            total_inserted += len(rows)

        # Mark list ready
        db.table("recipient_lists").update({
            "status": "ready",
            "valid_count": total_inserted,
            "processed_at": datetime.utcnow().isoformat(),
        }).eq("id", list_id).execute()

        logger.info(
            f"Recipient list {list_id} processed successfully"
        )

    except Exception as e:

        logger.error(
            f"Failed saving recipients for list {list_id}: {e}"
        )

        db.table("recipient_lists").update({
            "status": "failed"
        }).eq("id", list_id).execute()


@router.get("/lists")
def get_lists():

    db = get_supabase()

    result = (
        db.table("recipient_lists")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return result.data


@router.get("/lists/{list_id}")
def get_list(list_id: str):

    db = get_supabase()

    result = (
        db.table("recipient_lists")
        .select("*")
        .eq("id", list_id)
        .single()
        .execute()
    )

    return result.data


@router.delete("/lists/{list_id}")
def delete_list(list_id: str):

    db = get_supabase()

    # Delete recipients first
    db.table("recipients") \
        .delete() \
        .eq("list_id", list_id) \
        .execute()

    # Delete list
    db.table("recipient_lists") \
        .delete() \
        .eq("id", list_id) \
        .execute()

    return {
        "deleted": list_id
    }