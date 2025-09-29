from fastapi import APIRouter
from datetime import datetime
from app.config import settings

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "openai_configured": bool(settings.openai_api_key)
    }