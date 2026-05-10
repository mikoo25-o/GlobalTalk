from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.recipients import router as recipients_router
from api.accounts   import router as accounts_router
from api.campaigns  import router as campaigns_router
from api.analytics  import router as analytics_router, templates_router
from api.webhook    import router as webhook_router

app = FastAPI(title="TransMsg API", version="2.0.0", description="Bulk Messaging & Translation Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recipients_router, prefix="/api")
app.include_router(accounts_router,   prefix="/api")
app.include_router(campaigns_router,  prefix="/api")
app.include_router(analytics_router,  prefix="/api")
app.include_router(templates_router,  prefix="/api")
app.include_router(webhook_router,    prefix="/api")

@app.get("/")
def root():
    return {"message": "TransMsg API v2 running", "docs": "/docs"}

@app.get("/api/health")
def health():
    from core.config import get_settings
    s = get_settings()
    return {
        "status": "ok",
        "test_mode": s.test_mode,
        "supabase": bool(s.supabase_url),
        "whatsapp": bool(s.whatsapp_access_token),
        "twilio":   bool(s.twilio_account_sid),
        "telegram": bool(s.telegram_bot_token),
        "translate":bool(s.google_translate_api_key),
    }
