"""
Bounding Box Validation and Conversion Service
Provides utilities for validating and converting bounding box coordinates
"""

from typing import List, Tuple, Optional, Dict, Any
from pathlib import Path
import numpy as np
from PIL import Image
import cv2
import io
import base64

from app.models import DetectedObject, BoundingBox


class BBoxValidator:
    """Service for validating and converting bounding box coordinates"""

    def __init__(self):
        self.min_box_size = 0.5  # Minimum 0.5% of image
        self.max_box_size = 100.0  # Maximum 100% of image

    def validate_bbox(self, bbox: BoundingBox) -> Tuple[bool, Optional[str]]:
        """
        Validate a bounding box for reasonable values

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if coordinates are within valid range
        if bbox.x < 0 or bbox.x > 100:
            return False, f"X coordinate {bbox.x} out of range (0-100)"

        if bbox.y < 0 or bbox.y > 100:
            return False, f"Y coordinate {bbox.y} out of range (0-100)"

        if bbox.width <= 0 or bbox.width > 100:
            return False, f"Width {bbox.width} invalid (must be > 0 and <= 100)"

        if bbox.height <= 0 or bbox.height > 100:
            return False, f"Height {bbox.height} invalid (must be > 0 and <= 100)"

        # Check if box extends beyond image bounds
        if bbox.x + bbox.width > 100:
            return False, f"Box extends beyond right edge (x+width={bbox.x + bbox.width})"

        if bbox.y + bbox.height > 100:
            return False, f"Box extends beyond bottom edge (y+height={bbox.y + bbox.height})"

        # Check minimum size
        if bbox.width < self.min_box_size or bbox.height < self.min_box_size:
            return False, f"Box too small (min size is {self.min_box_size}%)"

        return True, None

    def fix_bbox(self, bbox: BoundingBox) -> BoundingBox:
        """
        Attempt to fix common bounding box issues

        Args:
            bbox: Original bounding box

        Returns:
            Fixed bounding box
        """
        # Ensure coordinates are within bounds
        fixed_x = max(0, min(100, bbox.x))
        fixed_y = max(0, min(100, bbox.y))

        # Ensure width and height don't extend beyond bounds
        max_width = 100 - fixed_x
        max_height = 100 - fixed_y

        fixed_width = max(self.min_box_size, min(bbox.width, max_width))
        fixed_height = max(self.min_box_size, min(bbox.height, max_height))

        return BoundingBox(
            x=fixed_x,
            y=fixed_y,
            width=fixed_width,
            height=fixed_height
        )

    def percentage_to_pixels(
        self,
        bbox: BoundingBox,
        img_width: int,
        img_height: int
    ) -> Tuple[int, int, int, int]:
        """
        Convert percentage-based bbox to pixel coordinates

        Args:
            bbox: Bounding box with percentage coordinates
            img_width: Image width in pixels
            img_height: Image height in pixels

        Returns:
            Tuple of (x1, y1, x2, y2) in pixels
        """
        x1 = int(bbox.x * img_width / 100)
        y1 = int(bbox.y * img_height / 100)
        x2 = int((bbox.x + bbox.width) * img_width / 100)
        y2 = int((bbox.y + bbox.height) * img_height / 100)

        return x1, y1, x2, y2

    def pixels_to_percentage(
        self,
        x1: int, y1: int, x2: int, y2: int,
        img_width: int, img_height: int
    ) -> BoundingBox:
        """
        Convert pixel coordinates to percentage-based bbox

        Args:
            x1, y1, x2, y2: Pixel coordinates
            img_width: Image width in pixels
            img_height: Image height in pixels

        Returns:
            BoundingBox with percentage coordinates
        """
        x = (x1 / img_width) * 100
        y = (y1 / img_height) * 100
        width = ((x2 - x1) / img_width) * 100
        height = ((y2 - y1) / img_height) * 100

        return BoundingBox(x=x, y=y, width=width, height=height)

    def validate_and_fix_objects(
        self,
        objects: List[DetectedObject]
    ) -> Tuple[List[DetectedObject], List[str]]:
        """
        Validate and fix all detected objects

        Returns:
            Tuple of (fixed_objects, warning_messages)
        """
        fixed_objects = []
        warnings = []

        for obj in objects:
            is_valid, error = self.validate_bbox(obj.bounding_box)

            if not is_valid:
                warnings.append(f"{obj.label}: {error}")
                # Try to fix the bbox
                fixed_bbox = self.fix_bbox(obj.bounding_box)
                obj.bounding_box = fixed_bbox
                warnings.append(f"{obj.label}: Attempted to fix bounding box")

            fixed_objects.append(obj)

        return fixed_objects, warnings

    def calculate_iou(self, bbox1: BoundingBox, bbox2: BoundingBox) -> float:
        """
        Calculate Intersection over Union for two bounding boxes

        Args:
            bbox1, bbox2: Bounding boxes to compare

        Returns:
            IoU score (0-1)
        """
        # Calculate intersection
        x_left = max(bbox1.x, bbox2.x)
        y_top = max(bbox1.y, bbox2.y)
        x_right = min(bbox1.x + bbox1.width, bbox2.x + bbox2.width)
        y_bottom = min(bbox1.y + bbox1.height, bbox2.y + bbox2.height)

        if x_right < x_left or y_bottom < y_top:
            return 0.0

        intersection_area = (x_right - x_left) * (y_bottom - y_top)

        # Calculate union
        bbox1_area = bbox1.width * bbox1.height
        bbox2_area = bbox2.width * bbox2.height
        union_area = bbox1_area + bbox2_area - intersection_area

        return intersection_area / union_area if union_area > 0 else 0

    def remove_duplicates(
        self,
        objects: List[DetectedObject],
        iou_threshold: float = 0.7
    ) -> List[DetectedObject]:
        """
        Remove duplicate detections based on IoU

        Args:
            objects: List of detected objects
            iou_threshold: IoU threshold for considering duplicates

        Returns:
            Filtered list without duplicates
        """
        if not objects:
            return []

        # Sort by confidence
        sorted_objects = sorted(objects, key=lambda x: x.confidence, reverse=True)
        keep = []

        for obj in sorted_objects:
            # Check against already kept objects
            is_duplicate = False
            for kept_obj in keep:
                if self.calculate_iou(obj.bounding_box, kept_obj.bounding_box) > iou_threshold:
                    is_duplicate = True
                    break

            if not is_duplicate:
                keep.append(obj)

        return keep


class BBoxVisualizer:
    """Service for creating visual overlays with OpenCV"""

    @staticmethod
    def draw_bboxes_opencv(
        image_path: Path,
        objects: List[DetectedObject],
        output_format: str = "base64"
    ) -> str:
        """
        Draw bounding boxes on image using OpenCV

        Args:
            image_path: Path to the image file
            objects: List of detected objects
            output_format: "base64" or "file"

        Returns:
            Base64 encoded image or file path
        """
        # Load image
        image = cv2.imread(str(image_path))
        img_height, img_width = image.shape[:2]

        # Color map for different object types
        colors = {
            "person": (255, 0, 0),      # Red
            "vehicle": (0, 255, 0),      # Green
            "cone": (0, 165, 255),       # Orange
            "furniture": (255, 255, 0),  # Cyan
            "default": (128, 0, 128)    # Purple
        }

        validator = BBoxValidator()

        for obj in objects:
            # Convert percentage to pixels
            x1, y1, x2, y2 = validator.percentage_to_pixels(
                obj.bounding_box, img_width, img_height
            )

            # Determine color based on label
            color = colors.get("default")
            label_lower = obj.label.lower()
            for key in colors:
                if key in label_lower:
                    color = colors[key]
                    break

            # Draw rectangle
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)

            # Prepare label with confidence
            label = f"{obj.label} ({int(obj.confidence * 100)}%)"

            # Calculate text size
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.6
            thickness = 2
            (text_width, text_height), baseline = cv2.getTextSize(
                label, font, font_scale, thickness
            )

            # Draw background for text
            cv2.rectangle(
                image,
                (x1, y1 - text_height - 10),
                (x1 + text_width, y1),
                color,
                -1
            )

            # Put text
            cv2.putText(
                image,
                label,
                (x1, y1 - 5),
                font,
                font_scale,
                (255, 255, 255),  # White text
                thickness
            )

        if output_format == "base64":
            # Convert to base64
            _, buffer = cv2.imencode('.jpg', image)
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            return f"data:image/jpeg;base64,{image_base64}"
        else:
            # Save to file
            output_path = image_path.parent / f"{image_path.stem}_with_boxes.jpg"
            cv2.imwrite(str(output_path), image)
            return str(output_path)