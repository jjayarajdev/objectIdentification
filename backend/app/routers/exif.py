from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
from typing import Optional

from app.config import settings
from app.models import ExifMetadata
from app.services.exif_extractor import ExifExtractor
from app.services.storage import StorageService

router = APIRouter()

# Initialize services
exif_extractor = ExifExtractor()
storage_service = StorageService()

@router.get("/exif/{image_id}", response_model=ExifMetadata)
async def get_image_exif(
    image_id: str,
    file_extension: str = Query(".jpg", description="File extension including dot")
):
    """
    Extract EXIF metadata from an uploaded image.

    Args:
        image_id: The unique ID of the uploaded image
        file_extension: The file extension (e.g., '.jpg', '.png')

    Returns:
        ExifMetadata containing the extracted metadata
    """
    try:
        # Get the file path
        file_path = storage_service.get_file_path(image_id, file_extension)

        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Image with ID {image_id} not found"
            )

        # Extract EXIF metadata
        metadata = exif_extractor.extract_metadata(file_path)

        return metadata

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting EXIF metadata: {str(e)}"
        )

@router.post("/exif/extract")
async def extract_exif_from_path(
    file_path: str
):
    """
    Extract EXIF metadata from an image file path.
    This endpoint is mainly for testing purposes.

    Args:
        file_path: Full path to the image file

    Returns:
        ExifMetadata containing the extracted metadata
    """
    try:
        path = Path(file_path)

        if not path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {file_path}"
            )

        if not path.is_file():
            raise HTTPException(
                status_code=400,
                detail="Path must point to a file, not a directory"
            )

        # Extract EXIF metadata
        metadata = exif_extractor.extract_metadata(path)

        return metadata

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting EXIF metadata: {str(e)}"
        )