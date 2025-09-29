import base64
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import asyncio
from openai import AsyncOpenAI
import time

from app.config import settings
from app.models import DetectedObject, BoundingBox, TokenUsage, CostEstimate
from app.services.bbox_validator import BBoxValidator

class GPTVisionService:
    """Service for object detection using GPT-4o Vision"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"

    def encode_image(self, image_path: Path) -> str:
        """Encode image to base64 for API transmission"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    async def detect_objects(self, image_path: Path) -> Tuple[List[DetectedObject], Optional[str], TokenUsage, float]:
        """
        Detect objects in an image using GPT-4o Vision

        Returns:
            Tuple of (detected_objects, analysis, token_usage, processing_time)
        """
        start_time = time.time()
        print(f"GPTVisionService: Processing image {image_path}")

        # Get image dimensions
        from PIL import Image
        with Image.open(image_path) as img:
            img_width, img_height = img.size
            print(f"GPTVisionService: Image dimensions: {img_width}x{img_height}")

        # Encode the image
        base64_image = self.encode_image(image_path)
        print(f"GPTVisionService: Image encoded, size: {len(base64_image)} chars")

        # Create the prompt for object detection
        prompt = """You are an expert object detection system. Your task is to identify and locate EVERY SINGLE object in this image with EXTREMELY PRECISE bounding boxes.

CRITICAL REQUIREMENTS:
1. **COUNT EVERY INSTANCE SEPARATELY** - If you see 10 chairs, create 10 separate chair objects
2. **ULTRA-PRECISE BOUNDING BOXES** - Provide exact coordinates with decimal precision
3. **NO GROUPING** - Never group similar objects together. Each physical object gets its own entry
4. **SYSTEMATIC SCANNING** - Mentally divide the image into a 10x10 grid and scan each section

BOUNDING BOX INSTRUCTIONS (USE PERCENTAGES WITH DECIMAL PRECISION):
- x: horizontal position of LEFT EDGE as percentage (0.0 to 100.0, use decimals like 23.5)
- y: vertical position of TOP EDGE as percentage (0.0 to 100.0, use decimals like 45.7)
- width: object width as percentage of image width (use decimals)
- height: object height as percentage of image height (use decimals)
- BE EXTREMELY PRECISE - measure carefully where each object starts and ends
- The bounding box should TIGHTLY fit the object with minimal padding
- Double-check your coordinates - ensure x+width doesn't exceed 100 and y+height doesn't exceed 100

For office/indoor scenes, detect ALL of these individually:
- **Furniture**: EVERY chair (office chairs, visitor chairs), EVERY desk, EVERY table, EVERY cabinet
- **People**: EVERY person (even partially visible)
- **Electronics**: EVERY monitor, computer, laptop, keyboard, mouse, phone
- **Office Items**: EVERY plant, water bottle, mug, notebook, pen holder
- **Infrastructure**: ceiling tiles, lights (each fixture), windows, doors

For outdoor/parking scenes, detect ALL of these individually:
- **Vehicles**: EVERY car, truck, bus, motorcycle
- **People**: EVERY person
- **Safety**: EVERY traffic cone, barrier, sign
- **Infrastructure**: buildings, roads, parking spaces
- **Nature**: EVERY tree, plant

LABELING CONVENTION:
- For multiple instances, use numbering: "Office Chair 1", "Office Chair 2", "Monitor 1", "Monitor 2"
- Be specific: "Standing Person", "Sitting Person", "Red Car", "White Van"

Return ONLY valid JSON in this exact format:
{
  "objects": [
    {
      "label": "string (specific, numbered for multiples)",
      "confidence": float (0.0 to 1.0),
      "bounding_box": {
        "x": float (left edge position as %, 0.0-100.0, USE DECIMALS),
        "y": float (top edge position as %, 0.0-100.0, USE DECIMALS),
        "width": float (object width as %, USE DECIMALS),
        "height": float (object height as %, USE DECIMALS)
      }
    }
  ],
  "analysis": "Detailed analysis including EXACT counts: 'Detected X chairs, Y monitors, Z people...'"
}

VALIDATION: After detection, verify you have found ALL instances. If an office has workstations, there should be multiple chairs and monitors."""

        try:
            # Call GPT-4o Vision API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=4000,
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            # Parse the response
            result = json.loads(response.choices[0].message.content)
            print(f"GPTVisionService: API response received, found {len(result.get('objects', []))} objects")

            # Extract analysis
            analysis = result.get("analysis", "")

            # Initialize validator
            validator = BBoxValidator()

            # Convert to DetectedObject models
            detected_objects = []
            for i, obj in enumerate(result.get("objects", [])):
                bbox = obj.get("bounding_box", {})
                print(f"Object {i}: {obj.get('label')} - BBox: x={bbox.get('x')}, y={bbox.get('y')}, w={bbox.get('width')}, h={bbox.get('height')}")

                # Create bounding box
                bounding_box = BoundingBox(
                    x=bbox.get("x", 0),
                    y=bbox.get("y", 0),
                    width=bbox.get("width", 10),
                    height=bbox.get("height", 10)
                )

                # Validate and potentially fix the bounding box
                is_valid, error = validator.validate_bbox(bounding_box)
                if not is_valid:
                    print(f"  Warning: {obj.get('label')} bbox invalid: {error}")
                    bounding_box = validator.fix_bbox(bounding_box)
                    print(f"  Fixed bbox: x={bounding_box.x}, y={bounding_box.y}, w={bounding_box.width}, h={bounding_box.height}")

                detected_object = DetectedObject(
                    label=obj.get("label", "Unknown"),
                    confidence=obj.get("confidence", 0.5),
                    bounding_box=bounding_box
                )
                detected_objects.append(detected_object)
                print(f"  Created DetectedObject: {detected_object.label} with bbox: {detected_object.bounding_box}")

            # Remove duplicate detections
            original_count = len(detected_objects)
            detected_objects = validator.remove_duplicates(detected_objects)
            if len(detected_objects) < original_count:
                print(f"Removed {original_count - len(detected_objects)} duplicate detections")

            # Extract token usage
            usage = response.usage
            token_usage = TokenUsage(
                input_tokens=usage.prompt_tokens,
                output_tokens=usage.completion_tokens,
                total_tokens=usage.total_tokens
            )

            processing_time = time.time() - start_time

            return detected_objects, analysis, token_usage, processing_time

        except Exception as e:
            print(f"Error in GPT-4o Vision detection: {e}")
            import traceback
            traceback.print_exc()
            # Return empty results on error
            return [], None, TokenUsage(), time.time() - start_time

    def calculate_cost(self, token_usage: TokenUsage) -> CostEstimate:
        """
        Calculate the cost based on token usage

        Args:
            token_usage: TokenUsage object with token counts

        Returns:
            CostEstimate with calculated costs
        """
        input_cost = (token_usage.input_tokens / 1000) * settings.input_token_cost
        output_cost = (token_usage.output_tokens / 1000) * settings.output_token_cost
        total_cost = input_cost + output_cost

        return CostEstimate(
            input_cost=input_cost,
            output_cost=output_cost,
            total_cost=total_cost
        )

    async def process_batch(
        self,
        image_paths: List[Path],
        max_concurrent: int = 5
    ) -> List[Tuple[List[DetectedObject], TokenUsage, float]]:
        """
        Process multiple images in parallel with concurrency control

        Args:
            image_paths: List of image paths to process
            max_concurrent: Maximum number of concurrent API calls

        Returns:
            List of results for each image
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def process_with_semaphore(path):
            async with semaphore:
                return await self.detect_objects(path)

        tasks = [process_with_semaphore(path) for path in image_paths]
        return await asyncio.gather(*tasks)