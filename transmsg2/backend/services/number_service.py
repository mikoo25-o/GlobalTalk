import phonenumbers
import pandas as pd
import io
from typing import List, Dict, Tuple
import math


def validate_phone(number: str) -> Tuple[bool, str]:
    """
    Validate and normalize a phone number.
    Returns (is_valid, normalized_number)
    """
    raw = number.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not raw:
        return False, raw
    # Add + if missing
    if not raw.startswith("+"):
        raw = "+" + raw
    try:
        parsed = phonenumbers.parse(raw, None)
        if phonenumbers.is_valid_number(parsed):
            normalized = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            return True, normalized
        return False, raw
    except Exception:
        return False, raw


def parse_numbers_from_text(text: str) -> List[str]:
    """Parse phone numbers from pasted text (one per line, comma, or semicolon separated)."""
    import re
    # Split on newlines, commas, semicolons, pipes
    raw = re.split(r'[\n,;\|\s]+', text)
    return [r.strip() for r in raw if r.strip()]


def parse_numbers_from_csv(file_bytes: bytes, filename: str) -> List[str]:
    """
    Parse phone numbers from CSV or Excel file.
    Auto-detects the column containing phone numbers.
    """
    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            # Try different encodings
            for enc in ["utf-8", "latin-1", "cp1252"]:
                try:
                    df = pd.read_csv(io.BytesIO(file_bytes), encoding=enc)
                    break
                except Exception:
                    continue

        # Find phone column automatically
        phone_col = None
        phone_keywords = ["phone", "mobile", "number", "tel", "cell", "whatsapp", "contact"]
        for col in df.columns:
            if any(kw in col.lower() for kw in phone_keywords):
                phone_col = col
                break
        # Fallback: use first column
        if phone_col is None:
            phone_col = df.columns[0]

        numbers = df[phone_col].dropna().astype(str).tolist()
        return [n.strip() for n in numbers if n.strip()]
    except Exception as e:
        raise ValueError(f"Could not parse file: {e}")


def process_numbers(raw_numbers: List[str]) -> Dict:
    """
    Validate, deduplicate, and normalize a list of phone numbers.
    Returns summary with valid/invalid/duplicate counts.
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


def split_numbers_across_accounts(numbers: List[str], accounts: List[Dict], group_size: int = 2000) -> List[Dict]:
    """
    Auto-split numbers across accounts.

    Rules:
    - Default group size: 2,000 per account
    - If more numbers than accounts * group_size: distribute evenly
    - Returns list of assignments: {account_id, numbers, from_idx, to_idx}

    Example: 10,000 numbers, 5 accounts → 2,000 each
    Example: 10,000 numbers, 3 accounts → 3334, 3333, 3333
    """
    if not accounts:
        raise ValueError("No active accounts available for sending")
    if not numbers:
        raise ValueError("No valid numbers to send to")

    n_accounts = len(accounts)
    total = len(numbers)

    # Calculate how many numbers per account
    per_account = math.ceil(total / n_accounts)

    assignments = []
    idx = 0

    for i, account in enumerate(accounts):
        start = idx
        end = min(idx + per_account, total)
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


def format_message(template: str, variables: Dict) -> str:
    """Replace {{variable}} placeholders in message template."""
    result = template
    for key, value in variables.items():
        result = result.replace("{{" + key + "}}", str(value))
    return result
