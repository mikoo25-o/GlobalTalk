import asyncio
import html
import logging
from typing import Dict, List

import httpx

from core.config import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# SUPPORTED LANGUAGES
# ─────────────────────────────────────────────────────────────

SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "zh": "Chinese",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "vi": "Vietnamese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "ru": "Russian",
    "tl": "Tagalog",
}


# ─────────────────────────────────────────────────────────────
# SIMPLE MEMORY CACHE
# ─────────────────────────────────────────────────────────────

_translation_cache = {}


# ─────────────────────────────────────────────────────────────
# CACHE KEY
# ─────────────────────────────────────────────────────────────

def _cache_key(
    text: str,
    target: str,
    source: str
) -> str:

    return f"{source}:{target}:{text}"


# ─────────────────────────────────────────────────────────────
# CLEAN TRANSLATION TEXT
# ─────────────────────────────────────────────────────────────

def clean_translation(text: str) -> str:

    return html.unescape(text).strip()


# ─────────────────────────────────────────────────────────────
# GOOGLE TRANSLATE
# ─────────────────────────────────────────────────────────────

async def translate_google(
    text: str,
    target: str,
    source: str = "en"
) -> str:

    if target == source:
        return text

    url = "https://translation.googleapis.com/language/translate/v2"

    params = {
        "q": text,
        "source": source,
        "target": target,
        "key": settings.google_translate_api_key,
        "format": "text"
    }

    timeout = httpx.Timeout(20.0)

    async with httpx.AsyncClient(timeout=timeout) as client:

        response = await client.post(
            url,
            params=params
        )

        response.raise_for_status()

        data = response.json()

        translated = data["data"]["translations"][0]["translatedText"]

        return clean_translation(translated)


# ─────────────────────────────────────────────────────────────
# VALIDATE LANGUAGE
# ─────────────────────────────────────────────────────────────

def validate_language(lang: str):

    if lang not in SUPPORTED_LANGUAGES:

        raise ValueError(
            f"Unsupported language: {lang}"
        )


# ─────────────────────────────────────────────────────────────
# SINGLE TRANSLATION
# ─────────────────────────────────────────────────────────────

async def translate_text(
    text: str,
    target: str,
    source: str = "en"
) -> str:

    validate_language(target)

    if not text or not text.strip():
        return text

    if target == source:
        return text

    cache_key = _cache_key(text, target, source)

    # Cache hit

    if cache_key in _translation_cache:

        return _translation_cache[cache_key]

    # No API key fallback

    if not settings.google_translate_api_key:

        fallback = f"[{target.upper()}] {text}"

        _translation_cache[cache_key] = fallback

        return fallback

    try:

        translated = await translate_google(
            text=text,
            target=target,
            source=source
        )

        _translation_cache[cache_key] = translated

        return translated

    except Exception as e:

        logger.error(
            f"Translation failed "
            f"{source}->{target}: {e}"
        )

        fallback = f"[{target.upper()}] {text}"

        _translation_cache[cache_key] = fallback

        return fallback


# ─────────────────────────────────────────────────────────────
# MULTI LANGUAGE TRANSLATION
# ─────────────────────────────────────────────────────────────

async def translate_to_all(
    text: str,
    languages: List[str]
) -> Dict[str, str]:

    if not text:
        return {}

    # Remove duplicates while preserving order

    seen = set()

    unique_languages = []

    for lang in languages:

        if lang not in seen:

            seen.add(lang)
            unique_languages.append(lang)

    # Ensure English always exists

    if "en" not in unique_languages:
        unique_languages.insert(0, "en")

    results = {
        "en": text
    }

    tasks = []

    translation_languages = []

    for lang in unique_languages:

        if lang == "en":
            continue

        translation_languages.append(lang)

        tasks.append(
            translate_text(
                text=text,
                target=lang,
                source="en"
            )
        )

    translated_results = await asyncio.gather(
        *tasks,
        return_exceptions=True
    )

    for lang, result in zip(
        translation_languages,
        translated_results
    ):

        if isinstance(result, Exception):

            logger.error(
                f"Translation task failed for {lang}: {result}"
            )

            results[lang] = f"[{lang.upper()}] {text}"

        else:

            results[lang] = result

    return results


# ─────────────────────────────────────────────────────────────
# CACHE MANAGEMENT
# ─────────────────────────────────────────────────────────────

def clear_translation_cache():

    _translation_cache.clear()

    logger.info("Translation cache cleared")


def get_cache_size() -> int:

    return len(_translation_cache)