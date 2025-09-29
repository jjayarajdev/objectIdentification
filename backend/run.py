#!/usr/bin/env python3
"""
Run script for the Object Detection API backend.
"""

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print("🚀 Starting Object Detection API...")
    print(f"📍 Server: http://{settings.host}:{settings.port}")
    print(f"📚 Docs: http://{settings.host}:{settings.port}/docs")
    print(f"🔧 OpenAPI: http://{settings.host}:{settings.port}/openapi.json")

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )