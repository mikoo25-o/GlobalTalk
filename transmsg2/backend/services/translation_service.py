import httpx
from core.config import get_settings

settings = get_settings()

SUPPORTED_LANGUAGES = {
    "en": "English", "es": "Spanish", "zh": "Chinese",
    "fr": "French",  "de": "German",  "pt": "Portuguese",
    "vi": "Vietnamese", "ko": "Korean", "ar": "Arabic",
    "hi": "Hindi",   "ru": "Russian", "tl": "Tagalog",
}


async def translate_google(text: str, target: str, source: str = "en") -> str:
    if target == source:
        return text
    url = "https://translation.googleapis.com/language/translate/v2"
    params = {"q": text, "source": source, "target": target,
               "key": settings.google_translate_api_key, "format": "text"}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, params=params)
        resp.raise_for_status()
        return resp.json()["data"]["translations"][0]["translatedText"]


async def translate_text(text: str, target: str, source: str = "en") -> str:
    """Translate text. Falls back to returning original if no API key configured."""
    if not settings.google_translate_api_key:
        return f"[{target.upper()}] {text}"
    try:
        return await translate_google(text, target, source)
    except Exception as e:
        return f"[Translation error: {e}]"


async def translate_to_all(text: str, languages: list[str]) -> dict:
    """Translate message to multiple languages. Returns {lang_code: translated_text}."""
    results = {"en": text}
    for lang in languages:
        if lang == "en":
            continue
        results[lang] = await translate_text(text, lang)
    return results
