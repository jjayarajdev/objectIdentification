from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import uuid
from datetime import datetime
import shutil
from pathlib import Path
import asyncio

from app.config import settings
from app.models import UploadResponse, ImageResult
from app.services.image_processor import ImageProcessor
from app.services.storage import StorageService

router = APIRouter()

# Initialize services
image_processor = ImageProcessor()
storage_service = StorageService()

@router.post("/upload", response_model=UploadResponse)
async def upload_single_image(
    file: UploadFile = File(...),
    process_immediately: bool = Form(True)
):
    """
    Upload a single image and optionally process it immediately.

    Args:
        file: The image file to upload
        process_immediately: Whether to process the image immediately after upload

    Returns:
        UploadResponse with image details and processing results
    """
    try:
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        # allowed_extensions is already parsed as a list by the validator
        if file_ext not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed. Allowed types: {settings.allowed_extensions}"
            )

        # Check file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        max_size_bytes = settings.max_file_size_mb * 1024 * 1024
        if file_size > max_size_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum allowed size of {settings.max_file_size_mb}MB"
            )

        # Generate unique ID for the image
        image_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()

        # Save the uploaded file
        saved_path = await storage_service.save_uploaded_file(
            file,
            image_id,
            file_ext
        )

        # Create initial image result
        image_result = ImageResult(
            filename=file.filename,
            upload_timestamp=timestamp,
            image_url=f"/uploads/{image_id}{file_ext}",
            image_id=image_id  # Include image_id for consistency
        )

        # Process immediately if requested
        if process_immediately:
            try:
                from app.services.gpt_vision import GPTVisionService
                from app.services.exif_extractor import ExifExtractor
                from app.services.scene_analyzer import SceneAnalyzer

                gpt_vision = GPTVisionService()
                exif_extractor = ExifExtractor()
                scene_analyzer = SceneAnalyzer()

                print(f"Starting comprehensive analysis for {saved_path}")

                # Perform adaptive scene analysis
                scene_analysis = await scene_analyzer.analyze_scene(saved_path)

                # Also perform traditional object detection for bounding boxes
                detected_objects, analysis, token_usage, processing_time = await gpt_vision.detect_objects(saved_path)
                print(f"Detected {len(detected_objects)} objects")

                # Calculate cost
                cost_estimate = gpt_vision.calculate_cost(token_usage)
                print(f"Cost estimate: ${cost_estimate.total_cost:.4f}")

                # Extract EXIF metadata
                exif_metadata = exif_extractor.extract_metadata(saved_path)

                # Update image result with detection data
                image_result.objects = detected_objects
                image_result.analysis = analysis
                image_result.exif = exif_metadata
                image_result.token_usage = token_usage
                image_result.cost_estimate = cost_estimate
                image_result.processing_time = processing_time

                # Add scene analysis data
                image_result.room_analysis = scene_analysis  # Keep field name for compatibility

                # Log the objects being sent
                print(f"Sending {len(detected_objects)} objects to frontend:")
                for i, obj in enumerate(detected_objects):
                    print(f"  {i}. {obj.label} - bbox: x={obj.bounding_box.x:.1f}, y={obj.bounding_box.y:.1f}, w={obj.bounding_box.width:.1f}, h={obj.bounding_box.height:.1f}")

            except Exception as e:
                print(f"Error processing image: {e}")
                import traceback
                traceback.print_exc()
                image_result.error = str(e)

        return UploadResponse(
            success=True,
            message="Image uploaded successfully",
            image_id=image_id,
            results=[image_result]
        )

    except HTTPException:
        raise
    except Exception as e:
        return UploadResponse(
            success=False,
            message="Upload failed",
            error=str(e)
        )

@router.post("/upload-batch", response_model=UploadResponse)
async def upload_batch_images(
    files: List[UploadFile] = File(...),
    process_immediately: bool = Form(True)
):
    """
    Upload multiple images as a batch.

    Args:
        files: List of image files to upload
        process_immediately: Whether to process images immediately after upload

    Returns:
        UploadResponse with batch details and processing results
    """
    try:
        if len(files) == 0:
            raise HTTPException(
                status_code=400,
                detail="No files provided"
            )

        batch_id = str(uuid.uuid4())
        results = []
        failed_uploads = []

        for file in files:
            try:
                # Validate each file
                file_ext = Path(file.filename).suffix.lower()
                # allowed_extensions is already parsed as a list by the validator
                if file_ext not in settings.allowed_extensions:
                    failed_uploads.append({
                        "filename": file.filename,
                        "error": f"File type {file_ext} not allowed"
                    })
                    continue

                # Check file size
                file.file.seek(0, 2)
                file_size = file.file.tell()
                file.file.seek(0)

                max_size_bytes = settings.max_file_size_mb * 1024 * 1024
                if file_size > max_size_bytes:
                    failed_uploads.append({
                        "filename": file.filename,
                        "error": f"File size exceeds {settings.max_file_size_mb}MB"
                    })
                    continue

                # Generate unique ID for each image
                image_id = str(uuid.uuid4())
                timestamp = datetime.utcnow()

                # Save the uploaded file
                saved_path = await storage_service.save_uploaded_file(
                    file,
                    image_id,
                    file_ext
                )

                # Create image result
                image_result = ImageResult(
                    filename=file.filename,
                    upload_timestamp=timestamp,
                    image_url=f"/uploads/{image_id}{file_ext}",
                    image_id=image_id  # Store the image_id for processing
                )

                # Store the saved path for later processing
                image_result._saved_path = saved_path  # Temporary attribute

                results.append(image_result)

            except Exception as e:
                failed_uploads.append({
                    "filename": file.filename,
                    "error": str(e)
                })

        # Process batch if requested
        if process_immediately and results:
            from app.services.gpt_vision import GPTVisionService
            from app.services.exif_extractor import ExifExtractor
            from app.services.scene_analyzer import SceneAnalyzer

            gpt_vision = GPTVisionService()
            exif_extractor = ExifExtractor()
            scene_analyzer = SceneAnalyzer()

            # Process each image in the batch
            for idx, image_result in enumerate(results):
                try:
                    saved_path = image_result._saved_path
                    print(f"Batch processing image {idx+1}/{len(results)}: {saved_path}")

                    # Perform adaptive scene analysis
                    scene_analysis = await scene_analyzer.analyze_scene(saved_path)

                    # Perform object detection
                    detected_objects, analysis, token_usage, processing_time = await gpt_vision.detect_objects(saved_path)
                    print(f"Detected {len(detected_objects)} objects in {image_result.filename}")

                    # Calculate cost
                    cost_estimate = gpt_vision.calculate_cost(token_usage)

                    # Extract EXIF metadata
                    exif_metadata = exif_extractor.extract_metadata(saved_path)

                    # Update image result with detection data
                    image_result.objects = detected_objects
                    image_result.analysis = analysis
                    image_result.exif = exif_metadata
                    image_result.token_usage = token_usage
                    image_result.cost_estimate = cost_estimate
                    image_result.processing_time = processing_time
                    image_result.room_analysis = scene_analysis  # Keep field name for compatibility

                    # Remove temporary attribute
                    delattr(image_result, '_saved_path')

                except Exception as e:
                    print(f"Error processing batch image {image_result.filename}: {e}")
                    image_result.error = str(e)
                    # Clean up temporary attribute if it exists
                    if hasattr(image_result, '_saved_path'):
                        delattr(image_result, '_saved_path')

        success_count = len(results)
        fail_count = len(failed_uploads)

        return UploadResponse(
            success=success_count > 0,
            message=f"Uploaded {success_count} images successfully, {fail_count} failed",
            batch_id=batch_id,
            results=results,
            error=str(failed_uploads) if failed_uploads else None
        )

    except HTTPException:
        raise
    except Exception as e:
        return UploadResponse(
            success=False,
            message="Batch upload failed",
            error=str(e)
        )