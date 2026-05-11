import os
import logging

from functools import lru_cache

from supabase import create_client, Client
from pydantic_settings import BaseSettings, SettingsConfigDict


logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# SETTINGS
# ─────────────────────────────────────────────────────────────

class Settings(BaseSettings):

    # Core
    app_name: str = "TransMsg"
    environment: str = "development"
    debug: bool = True

    secret_key: str = "change-me"

    test_mode: bool = True

    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""

    # WhatsApp
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # Telegram
    telegram_bot_token: str = ""

    # Google Translate
    google_translate_api_key: str = ""

    # Messaging
    default_rate_per_minute: int = 1000
    max_campaign_size: int = 500000
    max_upload_size_mb: int = 15

    # Logging
    log_level: str = "INFO"

    # Pydantic Settings
    model_config = SettingsConfigDict(
        env_file="../.env",
        extra="ignore",
        case_sensitive=False,
    )

    # ─────────────────────────────────────────────────────────
    # HELPERS
    # ─────────────────────────────────────────────────────────

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def has_supabase(self) -> bool:
        return bool(
            self.supabase_url and
            self.supabase_service_key
        )

    @property
    def has_google_translate(self) -> bool:
        return bool(self.google_translate_api_key)

    @property
    def has_twilio(self) -> bool:
        return bool(
            self.twilio_account_sid and
            self.twilio_auth_token
        )

    @property
    def has_whatsapp(self) -> bool:
        return bool(
            self.whatsapp_access_token and
            self.whatsapp_phone_number_id
        )

    @property
    def has_telegram(self) -> bool:
        return bool(self.telegram_bot_token)


# ─────────────────────────────────────────────────────────────
# SETTINGS SINGLETON
# ─────────────────────────────────────────────────────────────

@lru_cache()
def get_settings() -> Settings:

    settings = Settings()

    logger.info(
        f"Loaded settings for environment: "
        f"{settings.environment}"
    )

    return settings


# ─────────────────────────────────────────────────────────────
# SUPABASE CLIENT
# ─────────────────────────────────────────────────────────────

@lru_cache()
def get_supabase() -> Client:

    settings = get_settings()

    if not settings.supabase_url:
        raise RuntimeError(
            "SUPABASE_URL is missing"
        )

    if not settings.supabase_service_key:
        raise RuntimeError(
            "SUPABASE_SERVICE_KEY is missing"
        )

    try:

        client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        )

        logger.info("Supabase client initialized")

        return client

    except Exception as e:

        logger.error(
            f"Failed to initialize Supabase: {e}"
        )

        raise RuntimeError(
            "Could not connect to Supabase"
        )