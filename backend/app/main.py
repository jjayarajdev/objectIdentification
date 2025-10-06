from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import upload, detection, exif, export, health, room_analysis, config

# Create FastAPI app
app = FastAPI(
    title="Room Intelligence & Object Detection API",
    description="Advanced room analysis with object detection, cost estimation, comprehensive reporting, and Word document generation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving uploaded images
if os.path.exists(settings.upload_folder):
    app.mount("/uploads", StaticFiles(directory=settings.upload_folder), name="uploads")

# Mount static files for serving reports
if os.path.exists(settings.results_folder):
    app.mount("/reports", StaticFiles(directory=settings.results_folder), name="reports")

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(upload.router, prefix="/api/v1", tags=["Upload"])
app.include_router(detection.router, prefix="/api/v1", tags=["Detection"])
app.include_router(exif.router, prefix="/api/v1", tags=["EXIF"])
app.include_router(export.router, prefix="/api/v1", tags=["Export"])
app.include_router(room_analysis.router, prefix="/api/room-analysis", tags=["Room Intelligence"])
app.include_router(config.router, tags=["Configuration"])

@app.on_event("startup")
async def startup_event():
    print(f"Starting Object Detection API...")
    print(f"Upload folder: {settings.upload_folder}")
    print(f"Results folder: {settings.results_folder}")
    if not settings.openai_api_key:
        print("⚠️  Warning: OPENAI_API_KEY not set in environment variables")

@app.get("/")
async def root():
    return {
        "name": "Object Detection API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "upload": "/api/v1/upload",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload
    )