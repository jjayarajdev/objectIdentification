from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
import json
import csv
import io
from datetime import datetime
from pathlib import Path

from app.models import ExportFormat, ImageResult
from app.services.storage import StorageService

router = APIRouter()
storage_service = StorageService()

@router.post("/export/{image_id}")
async def export_detection_results(
    image_id: str,
    format: ExportFormat = Query(ExportFormat.JSON, description="Export format"),
    results: Optional[Dict[Any, Any]] = Body(None)
):
    """
    Export detection results in various formats

    Args:
        image_id: The image ID
        format: Export format (json, yolo, coco, csv)
        results: The detection results data

    Returns:
        File download response in requested format
    """
    try:
        if not results:
            raise HTTPException(
                status_code=400,
                detail="No results data provided"
            )

        # Extract objects from results
        objects = results.get("objects", [])
        filename = results.get("filename", f"image_{image_id}")
        analysis = results.get("analysis", "")
        exif = results.get("exif", {})
        token_usage = results.get("token_usage", {})
        cost_estimate = results.get("cost_estimate", {})
        processing_time = results.get("processing_time", 0)

        if format == ExportFormat.JSON:
            # Export as JSON
            export_data = {
                "image_id": image_id,
                "filename": filename,
                "timestamp": datetime.utcnow().isoformat(),
                "objects": objects,
                "analysis": analysis,
                "exif": exif,
                "token_usage": token_usage,
                "cost_estimate": cost_estimate,
                "processing_time": processing_time
            }

            json_str = json.dumps(export_data, indent=2)
            return StreamingResponse(
                io.BytesIO(json_str.encode()),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={image_id}_detection.json"}
            )

        elif format == ExportFormat.YOLO:
            # Export as YOLO format (class x_center y_center width height)
            # Note: YOLO format uses normalized coordinates (0-1)
            yolo_lines = []

            # Create a mapping of unique labels to class indices
            unique_labels = list(set(obj.get("label", "unknown") for obj in objects))
            label_map = {label: idx for idx, label in enumerate(unique_labels)}

            # Add comment with label mapping
            yolo_lines.append(f"# YOLO Format Export - {filename}")
            yolo_lines.append(f"# Image ID: {image_id}")
            yolo_lines.append(f"# Label mapping:")
            for label, idx in label_map.items():
                yolo_lines.append(f"# {idx}: {label}")
            yolo_lines.append("")

            # Add detection data
            for obj in objects:
                label = obj.get("label", "unknown")
                class_id = label_map[label]
                bbox = obj.get("bounding_box", {})

                # Convert to YOLO format (center coordinates)
                x = bbox.get("x", 0)
                y = bbox.get("y", 0)
                width = bbox.get("width", 0)
                height = bbox.get("height", 0)

                x_center = (x + width / 2) / 100
                y_center = (y + height / 2) / 100
                width_norm = width / 100
                height_norm = height / 100

                yolo_lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {width_norm:.6f} {height_norm:.6f}")

            yolo_str = "\n".join(yolo_lines)
            return StreamingResponse(
                io.BytesIO(yolo_str.encode()),
                media_type="text/plain",
                headers={"Content-Disposition": f"attachment; filename={image_id}_detection.txt"}
            )

        elif format == ExportFormat.COCO:
            # Export as COCO format
            coco_data = {
                "info": {
                    "description": "Object Detection Export",
                    "date_created": datetime.utcnow().isoformat(),
                    "version": "1.0"
                },
                "images": [
                    {
                        "id": 1,
                        "file_name": filename,
                        "width": exif.get("image_width", 1920),
                        "height": exif.get("image_height", 1080)
                    }
                ],
                "categories": [],
                "annotations": []
            }

            # Create categories
            unique_labels = list(set(obj.get("label", "unknown") for obj in objects))
            for idx, label in enumerate(unique_labels):
                coco_data["categories"].append({
                    "id": idx + 1,
                    "name": label,
                    "supercategory": "object"
                })

            # Create annotations
            label_to_id = {label: idx + 1 for idx, label in enumerate(unique_labels)}

            for idx, obj in enumerate(objects):
                bbox = obj.get("bounding_box", {})
                label = obj.get("label", "unknown")

                # Convert percentage to pixels
                img_width = exif.get("image_width", 1920)
                img_height = exif.get("image_height", 1080)

                x = (bbox.get("x", 0) / 100) * img_width
                y = (bbox.get("y", 0) / 100) * img_height
                width = (bbox.get("width", 0) / 100) * img_width
                height = (bbox.get("height", 0) / 100) * img_height

                coco_data["annotations"].append({
                    "id": idx + 1,
                    "image_id": 1,
                    "category_id": label_to_id[label],
                    "bbox": [x, y, width, height],
                    "area": width * height,
                    "iscrowd": 0,
                    "score": obj.get("confidence", 0)
                })

            coco_str = json.dumps(coco_data, indent=2)
            return StreamingResponse(
                io.BytesIO(coco_str.encode()),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={image_id}_coco.json"}
            )

        elif format == ExportFormat.CSV:
            # Export as CSV
            output = io.StringIO()
            writer = csv.writer(output)

            # Write header
            writer.writerow([
                "Image ID", "Filename", "Object #", "Label", "Confidence",
                "X", "Y", "Width", "Height", "Processing Time (s)"
            ])

            # Write data
            for idx, obj in enumerate(objects, 1):
                bbox = obj.get("bounding_box", {})
                writer.writerow([
                    image_id,
                    filename,
                    idx,
                    obj.get("label", "unknown"),
                    f"{obj.get('confidence', 0):.4f}",
                    f"{bbox.get('x', 0):.2f}",
                    f"{bbox.get('y', 0):.2f}",
                    f"{bbox.get('width', 0):.2f}",
                    f"{bbox.get('height', 0):.2f}",
                    f"{processing_time:.2f}" if processing_time else "N/A"
                ])

            # Add summary rows
            writer.writerow([])
            writer.writerow(["Summary"])
            writer.writerow(["Total Objects:", len(objects)])
            writer.writerow(["Unique Labels:", len(set(obj.get("label", "unknown") for obj in objects))])
            if cost_estimate.get("total_cost"):
                writer.writerow(["Total Cost:", f"${cost_estimate['total_cost']:.4f}"])
            writer.writerow([])

            # Add analysis if available
            if analysis:
                writer.writerow(["Analysis:"])
                # Split analysis into chunks for CSV
                analysis_lines = analysis.split('\n')
                for line in analysis_lines:
                    if line.strip():
                        writer.writerow([line])

            csv_str = output.getvalue()
            return StreamingResponse(
                io.BytesIO(csv_str.encode()),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={image_id}_detection.csv"}
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported export format: {format}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error exporting data: {str(e)}"
        )