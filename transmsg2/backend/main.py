import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.recipients import router as recipients_router
from api.accounts import router as accounts_router
from api.campaigns import router as campaigns_router
from api.analytics import (
    router as analytics_router,
    templates_router
)
from api.webhook import router as webhook_router

from core.config import (
    get_settings,
    get_supabase
)


# ─────────────────────────────────────────────────────────────
# SETTINGS
# ─────────────────────────────────────────────────────────────

settings = get_settings()


# ─────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)

logger = logging.getLogger("transmsg")


# ─────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="TransMsg API",
    version="2.0.0",
    description="Bulk Messaging & Translation Platform",
    docs_url="/docs",
    redoc_url="/redoc",
)


# ─────────────────────────────────────────────────────────────
# MIDDLEWARE
# ─────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():

    logger.info("Starting TransMsg API...")

    try:

        # Validate Supabase connection
        get_supabase()

        logger.info("Supabase connection established")

    except Exception as e:

        logger.error(f"Startup failed: {e}")

    logger.info(
        f"Environment: {settings.environment}"
    )

    logger.info(
        f"Test mode: {settings.test_mode}"
    )


@app.on_event("shutdown")
async def shutdown_event():

    logger.info("Shutting down TransMsg API")


# ─────────────────────────────────────────────────────────────
# ROUTERS
# ─────────────────────────────────────────────────────────────

app.include_router(
    recipients_router,
    prefix="/api"
)

app.include_router(
    accounts_router,
    prefix="/api"
)

app.include_router(
    campaigns_router,
    prefix="/api"
)

app.include_router(
    analytics_router,
    prefix="/api"
)

app.include_router(
    templates_router,
    prefix="/api"
)

app.include_router(
    webhook_router,
    prefix="/api"
)


# ─────────────────────────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────────────────────────

@app.get("/")
def root():

    return {
        "message": "TransMsg API v2 running",
        "docs": "/docs",
        "status": "online",
        "environment": settings.environment,
    }


# ─────────────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "test_mode": settings.test_mode,

        "services": {
            "supabase": bool(settings.supabase_url),
            "whatsapp": bool(settings.whatsapp_access_token),
            "twilio": bool(settings.twilio_account_sid),
            "telegram": bool(settings.telegram_bot_token),
            "translate": bool(settings.google_translate_api_key),
        }
    }


# ─────────────────────────────────────────────────────────────
# GLOBAL ERROR HANDLER
# ─────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):

    logger.error(f"Unhandled error: {exc}")

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error"
        }
    )