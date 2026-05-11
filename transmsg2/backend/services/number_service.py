import phonenumbers
import pandas as pd
import io
import re
import math
import logging

from typing import List, Dict, Tuple
from phonenumbers.phonenumberutil import NumberParseException

logger = logging.getLogger(__name__)

MAX_ROWS = 500000

PHONE_COLUMN_KEYWORDS = [
    "phone",
    "mobile",
    "number",
    "tel",
    "cell",
    "whatsapp",
    "contact",
]


# ─────────────────────────────────────────────────────────────
# PHONE VALIDATION
# ─────────────────────────────────────────────────────────────

def validate_phone(
    number: str,
    default_region: str = None
) -> Tuple[bool, str]:
    """
    Validate and normalize a phone number.

    Returns:
        (is_valid, normalized_number)
    """

    if not number:
        return False, ""

    raw = str(number).strip()

    # Remove spaces/symbols
    raw = re.sub(r"[^\d+]", "", raw)

    if not raw:
        return False, ""

    try:

        # Add + if missing
        if not raw.startswith("+"):
            raw = "+" + raw

        parsed = phonenumbers.parse(
            raw,
            default_region
        )

        if not phonenumbers.is_valid_number(parsed):
            return False, raw

        normalized = phonenumbers.format_number(
            parsed,
            phonenumbers.PhoneNumberFormat.E164
        )

        return True, normalized

    except NumberParseException:
        return False, raw

    except Exception as e:
        logger.error(f"Phone validation error: {e}")
        return False, raw


# ─────────────────────────────────────────────────────────────
# TEXT PARSING
# ─────────────────────────────────────────────────────────────

def parse_numbers_from_text(text: str) -> List[str]:
    """
    Parse numbers from pasted text.
    Supports:
    - newline
    - comma
    - semicolon
    - spaces
    - pipes
    """

    if not text:
        return []

    raw = re.split(r'[\n,;\|\t]+', text)

    cleaned = []

    for item in raw:

        value = item.strip()

        if not value:
            continue

        cleaned.append(value)

    return cleaned


# ─────────────────────────────────────────────────────────────
# CSV / EXCEL PARSING
# ─────────────────────────────────────────────────────────────

def parse_numbers_from_csv(
    file_bytes: bytes,
    filename: str
) -> List[str]:
    """
    Parse numbers from CSV or Excel.

    Auto-detects phone column.
    """

    try:

        # Excel
        if filename.endswith((".xlsx", ".xls")):

            df = pd.read_excel(
                io.BytesIO(file_bytes),
                dtype=str
            )

        # CSV
        else:

            df = None

            for enc in ["utf-8", "latin-1", "cp1252"]:

                try:

                    df = pd.read_csv(
                        io.BytesIO(file_bytes),
                        encoding=enc,
                        dtype=str
                    )

                    break

                except Exception:
                    continue

            if df is None:
                raise ValueError(
                    "Could not decode CSV file"
                )

        if df.empty:
            raise ValueError("Uploaded file is empty")

        if len(df) > MAX_ROWS:
            raise ValueError(
                f"File exceeds maximum limit of {MAX_ROWS:,} rows"
            )

        # Clean column names
        df.columns = [
            str(c).strip().lower()
            for c in df.columns
        ]

        # Find phone column
        phone_col = None

        for col in df.columns:

            if any(
                kw in col
                for kw in PHONE_COLUMN_KEYWORDS
            ):
                phone_col = col
                break

        # Fallback → first column
        if phone_col is None:
            phone_col = df.columns[0]

        # Remove empty rows
        df = df[df[phone_col].notna()]

        numbers = (
            df[phone_col]
            .astype(str)
            .str.strip()
            .tolist()
        )

        numbers = [
            n for n in numbers
            if n and n.lower() != "nan"
        ]

        return numbers

    except ValueError:
        raise

    except Exception as e:
        logger.error(f"CSV parse error: {e}")
        raise ValueError(f"Could not parse file: {e}")


# ─────────────────────────────────────────────────────────────
# NUMBER PROCESSING
# ─────────────────────────────────────────────────────────────

def process_numbers(
    raw_numbers: List[str]
) -> Dict:
    """
    Validate, normalize, and deduplicate numbers.
    """

    seen = set()

    valid = []
    invalid = []

    duplicates = 0

    for raw in raw_numbers:

        is_valid, normalized = validate_phone(raw)

        if not is_valid:
            invalid.append(raw)
            continue

        if normalized in seen:
            duplicates += 1
            continue

        seen.add(normalized)

        valid.append(normalized)

    return {
        "valid": valid,
        "invalid": invalid,
        "total_raw": len(raw_numbers),
        "valid_count": len(valid),
        "invalid_count": len(invalid),
        "duplicate_count": duplicates,
    }


# ─────────────────────────────────────────────────────────────
# ACCOUNT SPLITTING
# ─────────────────────────────────────────────────────────────

def split_numbers_across_accounts(
    numbers: List[str],
    accounts: List[Dict],
    group_size: int = 2000
) -> List[Dict]:
    """
    Auto split recipients across accounts.
    """

    if not accounts:
        raise ValueError(
            "No active accounts available"
        )

    if not numbers:
        raise ValueError(
            "No valid numbers to send"
        )

    total = len(numbers)
    n_accounts = len(accounts)

    # Even distribution
    per_account = math.ceil(
        total / n_accounts
    )

    assignments = []

    idx = 0

    for account in accounts:

        start = idx

        end = min(
            idx + per_account,
            total
        )

        chunk = numbers[start:end]

        if not chunk:
            break

        assignments.append({
            "account": account,
            "account_id": account["id"],
            "numbers": chunk,
            "from_idx": start,
            "to_idx": end,
            "count": len(chunk),
        })

        idx = end

        if idx >= total:
            break

    return assignments


# ─────────────────────────────────────────────────────────────
# TEMPLATE VARIABLES
# ─────────────────────────────────────────────────────────────

def format_message(
    template: str,
    variables: Dict
) -> str:
    """
    Replace {{variable}} placeholders.
    """

    if not template:
        return ""

    result = template

    for key, value in variables.items():

        placeholder = "{{" + str(key) + "}}"

        result = result.replace(
            placeholder,
            str(value)
        )

    return result