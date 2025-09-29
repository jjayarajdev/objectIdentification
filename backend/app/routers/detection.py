from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pathlib import Path

from app.models import ImageResult, BatchResult
from app.config import settings
from app.services.gpt_vision import GPTVisionService
from app.services.storage import StorageService
from app.services.exif_extractor import ExifExtractor
from datetime import datetime

router = APIRouter()

# Initialize services
gpt_vision = GPTVisionService()
storage_service = StorageService()
exif_extractor = ExifExtractor()

@router.post("/detect/{image_id}")
async def detect_objects_single(
    image_id: str,
    file_extension: str = Query(".jpg", description="File extension including dot")
):
    """
    Perform object detection on a single uploaded image using GPT-4o Vision.

    Args:
        image_id: The unique ID of the uploaded image
        file_extension: The file extension (e.g., '.jpg', '.png')

    Returns:
        ImageResult with detected objects, token usage, and cost
    """
    try:
        # Get the file path
        file_path = storage_service.get_file_path(image_id, file_extension)

        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Image with ID {image_id} not found"
            )

        # Perform object detection
        detected_objects, analysis, token_usage, processing_time = await gpt_vision.detect_objects(file_path)

        # Calculate cost
        cost_estimate = gpt_vision.calculate_cost(token_usage)

        # Extract EXIF metadata
        exif_metadata = exif_extractor.extract_metadata(file_path)

        # Create and return the result
        result = ImageResult(
            filename=file_path.name,
            upload_timestamp=datetime.utcnow(),
            image_url=f"/uploads/{image_id}{file_extension}",
            objects=detected_objects,
            analysis=analysis,
            exif=exif_metadata,
            token_usage=token_usage,
            cost_estimate=cost_estimate,
            processing_time=processing_time
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during object detection: {str(e)}"
        )

@router.post("/detect/batch/{batch_id}")
async def detect_objects_batch(
    batch_id: str
):
    """
    Perform object detection on a batch of uploaded images.
    """
    # This will be implemented with batch processing logic
    return {
        "message": "Batch detection endpoint - to be implemented",
        "batch_id": batch_id
    }