"""
Room Intelligence Analysis API Routes
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pathlib import Path
import uuid
from datetime import datetime
import io
import json

from app.config import settings
from app.services.scene_analyzer import SceneAnalyzer
from app.services.dspy_scene_analyzer import DSPySceneAnalysisService
from app.services.report_generator import ReportGenerator
from app.services.storage import StorageService

router = APIRouter()

# Initialize services
scene_analyzer = SceneAnalyzer()
dspy_scene_analyzer = DSPySceneAnalysisService()  # New DSPy-based analyzer
report_generator = ReportGenerator()
storage_service = StorageService()


@router.post("/analyze-room")
async def analyze_room(
    file: UploadFile = File(...),
    generate_report: bool = True,
    use_dspy: bool = True
):
    """
    Perform comprehensive room analysis

    Args:
        file: Image file to analyze
        generate_report: Whether to generate Word report
        use_dspy: Whether to use DSPy-based analysis for consistent prompting (default: True)

    Returns:
        Comprehensive room analysis with optional report download
    """
    try:
        # Validate file
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed"
            )

        # Save uploaded file
        image_id = str(uuid.uuid4())
        saved_path = await storage_service.save_uploaded_file(
            file,
            image_id,
            file_ext
        )

        # Perform scene analysis using selected analyzer
        if use_dspy:
            print(f"Starting DSPy-based scene analysis for {saved_path}")
            analysis = await dspy_scene_analyzer.analyze_scene(saved_path)
        else:
            print(f"Starting traditional scene analysis for {saved_path}")
            analysis = await scene_analyzer.analyze_scene(saved_path)

        # Add image metadata
        analysis["image_id"] = image_id
        analysis["filename"] = file.filename
        analysis["image_url"] = f"/uploads/{image_id}{file_ext}"

        # Generate Word report if requested
        if generate_report and "error" not in analysis:
            report_io = report_generator.create_word_report(analysis, saved_path)

            # Save report to storage
            report_filename = f"room_analysis_{image_id}.docx"
            report_path = Path(settings.results_folder) / report_filename

            with open(report_path, 'wb') as f:
                f.write(report_io.getvalue())

            analysis["report_url"] = f"/reports/{report_filename}"
            analysis["report_filename"] = report_filename

        return JSONResponse(content=analysis)

    except Exception as e:
        print(f"Error in room analysis: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download-report/{report_filename}")
async def download_report(report_filename: str):
    """
    Download generated Word report

    Args:
        report_filename: Name of the report file

    Returns:
        Word document as download
    """
    try:
        report_path = Path(settings.results_folder) / report_filename

        if not report_path.exists():
            raise HTTPException(status_code=404, detail="Report not found")

        # Read file
        with open(report_path, 'rb') as f:
            report_data = f.read()

        # Return as download
        return StreamingResponse(
            io.BytesIO(report_data),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={report_filename}"
            }
        )

    except Exception as e:
        print(f"Error downloading report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-scene-report")
async def generate_scene_report(data: dict):
    """
    Generate a Word document report for scene analysis

    Args:
        data: Scene analysis data including narrative_report

    Returns:
        Download URL for the generated report
    """
    try:
        # Generate Word report using the scene analysis method
        report_io = report_generator.create_scene_analysis_report(data)

        # Generate unique filename
        report_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"scene_analysis_{timestamp}_{report_id}.docx"

        # Save report to storage
        report_path = Path(settings.results_folder) / report_filename

        with open(report_path, 'wb') as f:
            f.write(report_io.getvalue())

        return JSONResponse(content={
            "success": True,
            "report_url": f"/api/room-analysis/download-report/{report_filename}",
            "report_filename": report_filename
        })

    except Exception as e:
        print(f"Error generating scene report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-batch")
async def analyze_batch_rooms(
    files: list[UploadFile] = File(...),
    generate_reports: bool = True
):
    """
    Analyze multiple room images

    Args:
        files: List of image files
        generate_reports: Whether to generate Word reports

    Returns:
        List of room analyses
    """
    try:
        results = []

        for file in files:
            # Validate file
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in settings.allowed_extensions:
                results.append({
                    "filename": file.filename,
                    "error": f"File type {file_ext} not allowed"
                })
                continue

            # Save file
            image_id = str(uuid.uuid4())
            saved_path = await storage_service.save_uploaded_file(
                file,
                image_id,
                file_ext
            )

            # Analyze scene using DSPy by default
            analysis = await dspy_scene_analyzer.analyze_scene(saved_path)

            # Add metadata
            analysis["image_id"] = image_id
            analysis["filename"] = file.filename
            analysis["image_url"] = f"/uploads/{image_id}{file_ext}"

            # Generate report if requested
            if generate_reports and "error" not in analysis:
                report_io = report_generator.create_word_report(analysis, saved_path)
                report_filename = f"room_analysis_{image_id}.docx"
                report_path = Path(settings.results_folder) / report_filename

                with open(report_path, 'wb') as f:
                    f.write(report_io.getvalue())

                analysis["report_url"] = f"/reports/{report_filename}"

            results.append(analysis)

        return JSONResponse(content={
            "success": True,
            "analyzed": len(results),
            "results": results
        })

    except Exception as e:
        print(f"Error in batch analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cost-database")
async def get_cost_database():
    """
    Get the cost estimation database

    Returns:
        Cost database with all categories and price ranges
    """
    return JSONResponse(content={})


@router.post("/custom-analysis")
async def custom_room_analysis(
    file: UploadFile = File(...),
    analysis_params: str = None
):
    """
    Perform custom room analysis with specific parameters

    Args:
        file: Image file
        analysis_params: JSON string with custom parameters

    Returns:
        Custom analysis results
    """
    try:
        # Parse custom parameters
        params = json.loads(analysis_params) if analysis_params else {}

        # Validate file
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed"
            )

        # Save file
        image_id = str(uuid.uuid4())
        saved_path = await storage_service.save_uploaded_file(
            file,
            image_id,
            file_ext
        )

        # Perform analysis with custom parameters using DSPy
        analysis = await dspy_scene_analyzer.analyze_scene(saved_path)

        # Filter results based on parameters if needed
        if "categories" in params:
            filtered_analysis = {
                "image_id": image_id,
                "filename": file.filename,
                "image_url": f"/uploads/{image_id}{file_ext}"
            }

            for category in params["categories"]:
                if category in analysis:
                    filtered_analysis[category] = analysis[category]

            analysis = filtered_analysis

        return JSONResponse(content=analysis)

    except Exception as e:
        print(f"Error in custom analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))