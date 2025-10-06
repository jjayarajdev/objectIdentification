from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/api/config", tags=["config"])

@router.get("/maps-key")
async def get_maps_api_key():
    """Get Google Maps API key for frontend use"""
    return {
        "apiKey": settings.google_maps_api_key
    }