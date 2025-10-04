"""
Universal Scene Analysis Service for Surveyor Images
Adapts analysis based on scene type (indoor, outdoor, industrial, infrastructure, etc.)
"""

import base64
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from openai import AsyncOpenAI
import time

from app.config import settings


class SceneAnalyzer:
    """Service for adaptive scene analysis based on image content"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"

    def encode_image(self, image_path: Path) -> str:
        """Encode image to base64 for API transmission"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def _validate_and_enhance_data(self, simplified_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Post-process simplified data to ensure counts are always included
        and format is consistent
        """
        import re

        enhanced_data = []
        for item in simplified_data:
            enhanced_item = {
                "identifier": item.get("identifier", "Unknown"),
                "details": item.get("details", ""),
                "estimated_cost": item.get("estimated_cost", "—")
            }

            # Check if details already contains a count
            details = enhanced_item["details"]

            # Common patterns for extracting counts
            count_patterns = [
                r"^(\d+)\s+",  # "5 cones"
                r"^(\d+)x\s+",  # "5x chairs"
                r"\((\d+)\)",  # "(5)"
                r":\s*(\d+)",  # ": 5"
                r"^\s*(\d+)$",  # Just a number
            ]

            has_count = False
            for pattern in count_patterns:
                if re.search(pattern, details):
                    has_count = True
                    break

            # If no count found and it's a countable item, try to extract from identifier
            if not has_count and enhanced_item["identifier"].lower() not in ["temperature", "people", "area", "height"]:
                # Check if identifier has a count
                for pattern in count_patterns:
                    match = re.search(pattern, enhanced_item["identifier"])
                    if match:
                        count = match.group(1)
                        # Add count to details if not already present
                        if details and not details.startswith(count):
                            enhanced_item["details"] = f"{count} {details}"
                        has_count = True
                        break

                # If still no count and it's a plural word, add "Multiple"
                if not has_count and details:
                    plural_indicators = ["s ", "s,", "es ", "es,", "ies ", "ies,"]
                    identifier_lower = enhanced_item["identifier"].lower()
                    for indicator in plural_indicators:
                        if indicator in identifier_lower or identifier_lower.endswith(indicator.strip(",")):
                            if not any(word in details.lower() for word in ["multiple", "several", "various", "many"]):
                                enhanced_item["details"] = f"Multiple {details.lower()}"
                            break

            # Ensure details is never empty for non-abstract categories
            if not enhanced_item["details"] and enhanced_item["identifier"].lower() not in ["temperature", "area", "height"]:
                enhanced_item["details"] = "1 unit"

            enhanced_data.append(enhanced_item)

        return enhanced_data

    async def analyze_scene(self, image_path: Path) -> Dict[str, Any]:
        """
        Perform adaptive scene analysis based on image content

        Returns:
            Dictionary containing scene-appropriate analysis
        """
        start_time = time.time()
        print(f"SceneAnalyzer: Analyzing scene from {image_path}")

        # Encode the image
        base64_image = self.encode_image(image_path)

        # Create adaptive analysis prompt
        prompt = """You are an expert surveyor and property analyst. Analyze this image comprehensively.

FIRST, determine the SCENE TYPE:
- indoor_office
- indoor_industrial (warehouse, factory floor)
- building_exterior
- land_property
- construction_site
- infrastructure (roads, bridges, utilities)
- agricultural
- natural_landscape
- parking_area
- other

Then provide a DETAILED ANALYSIS appropriate for the scene type. Include ONLY relevant categories:

FOR ALL SCENES, always include:
1. **scene_overview**: Brief description of what the image shows
2. **primary_features**: List of main elements visible
3. **measurements**: Estimated dimensions, areas, distances where applicable
4. **condition_assessment**: Current state, maintenance needs, quality
5. **safety_observations**: Any safety concerns or compliance issues

ADDITIONAL CATEGORIES based on scene:

FOR INDOOR SPACES:
- occupancy: People count and distribution
- furniture_equipment: Items present with materials
- lighting_systems: Natural and artificial lighting
- hvac_systems: Ventilation and temperature control
- flooring: Type and condition

FOR OUTDOOR PROPERTY/LAND:
- land_area: Estimated size and boundaries
- terrain: Topography, slope, drainage
- vegetation: Trees, grass, landscaping
- structures: Buildings, fences, utilities
- accessibility: Roads, pathways, entrances

FOR BUILDINGS/STRUCTURES:
- building_type: Commercial, residential, industrial
- construction_materials: Concrete, steel, brick, etc.
- stories_height: Number of floors, estimated height
- exterior_condition: Walls, roof, windows
- surrounding_area: Parking, landscaping, adjacent properties

FOR CONSTRUCTION/INDUSTRIAL:
- equipment_machinery: Types and quantities
- materials_storage: What's stored and how
- work_progress: Stage of construction/operation
- workforce: Number of workers visible
- safety_compliance: PPE, barriers, signage

FOR INFRASTRUCTURE:
- infrastructure_type: Road, bridge, utility, etc.
- condition_rating: Excellent/Good/Fair/Poor
- traffic_usage: Volume, type of vehicles
- maintenance_needs: Repairs required
- utilities_present: Power lines, pipes, cables

Return a JSON with this structure:
{
  "scene_type": "type from list above",
  "scene_overview": "comprehensive paragraph description",
  "simplified_data": [
    {
      "identifier": "Category like People/Temperature/Furniture/Lighting/etc",
      "details": "Concise description - for People: '9 total', for Temperature: '21-24°C (Central HVAC)', for Furniture: 'Couch, chair, coffee table, console', etc",
      "estimated_cost": "Cost range like '₹80K - ₹1.4L' or '—' if not applicable"
    }
  ],
  "narrative_report": "FULL DETAILED NARRATIVE REPORT in markdown format with emoji headers like:\n🧍 **Number of People**: detailed description\n🌡️ **Temperature**: detailed analysis\n🪑 **Furniture**: comprehensive list\netc. This should be the complete analysis suitable for Word document export",
  "analysis_data": [
    {
      "category": "category name",
      "items": [
        {
          "item": "item name",
          "details": "detailed description",
          "quantity": "number or N/A",
          "condition": "condition or N/A",
          "estimated_value": "value in INR or N/A",
          "notes": "additional notes"
        }
      ]
    }
  ],
  "key_observations": [
    "important observation 1",
    "important observation 2"
  ],
  "estimated_property_value": {
    "min": number or null,
    "max": number or null,
    "basis": "explanation of value estimate"
  }
}

IMPORTANT for simplified_data:
- Create SEPARATE rows for each distinct item type
- ALWAYS include counts in details (e.g., "3 cones, orange plastic" or "5 chairs, wooden")
- Keep category names generic: "Furniture", "Lighting", "Safety Equipment", "Vehicles", etc.
- Keep details concise but ALWAYS include quantity if more than 1
- Use "—" for estimated_cost when not applicable (like for People, Temperature)
- Format costs as "₹XXK - ₹XXL" or "₹XX - ₹XX per unit/each"
- Example rows:
  {"identifier": "People", "details": "9 total", "estimated_cost": "—"}
  {"identifier": "Temperature", "details": "21-24°C (Central HVAC)", "estimated_cost": "—"}
  {"identifier": "Traffic Cones", "details": "5 cones, orange plastic", "estimated_cost": "₹500 - ₹1,000 each"}
  {"identifier": "Furniture", "details": "L-shaped couch, 5-seater", "estimated_cost": "₹55K - ₹85K"}
  {"identifier": "Furniture", "details": "2 lounge chairs, leather", "estimated_cost": "₹12K - ₹25K each"}
  {"identifier": "Vehicles", "details": "3 sedans, parked", "estimated_cost": "—"}
  {"identifier": "Safety Equipment", "details": "10 barriers, metal", "estimated_cost": "₹2K - ₹5K each"}

Be specific and practical. Focus on information valuable for surveyors, property managers, and real estate professionals."""

        try:
            # Call GPT-4o Vision API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
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
                temperature=0.2,  # Even lower for more consistency
                response_format={"type": "json_object"},
                seed=42  # Fixed seed for reproducibility
            )

            # Parse response
            analysis = json.loads(response.choices[0].message.content)

            # Post-process simplified_data to ensure counts are always present
            if "simplified_data" in analysis:
                analysis["simplified_data"] = self._validate_and_enhance_data(analysis["simplified_data"])

            # Add metadata
            analysis["analysis_timestamp"] = datetime.utcnow().isoformat()
            analysis["processing_time_seconds"] = time.time() - start_time
            analysis["model_used"] = self.model

            # Calculate token usage
            usage = response.usage
            analysis["token_usage"] = {
                "input_tokens": usage.prompt_tokens,
                "output_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
                "estimated_cost_usd": (usage.prompt_tokens * 0.0025 + usage.completion_tokens * 0.01) / 1000
            }

            return analysis

        except Exception as e:
            print(f"Error in scene analysis: {e}")
            import traceback
            traceback.print_exc()

            # Attempt fallback analysis with simplified prompt
            try:
                return await self._fallback_analysis(image_path, start_time)
            except:
                return {
                    "error": str(e),
                    "processing_time_seconds": time.time() - start_time
                }

    async def _fallback_analysis(self, image_path: Path, start_time: float) -> Dict[str, Any]:
        """
        Fallback analysis with simplified prompt for edge cases
        """
        print("Attempting fallback analysis with simplified prompt...")

        base64_image = self.encode_image(image_path)

        # Simplified prompt focusing on essential information
        simple_prompt = """Analyze this image and provide a simple breakdown.

List the main items/features you can see in this format:
- Item name | Description/Count | Estimated value (if applicable)

Return as JSON with this structure:
{
  "scene_type": "indoor/outdoor/construction/other",
  "scene_overview": "Brief description",
  "simplified_data": [
    {"identifier": "Item name", "details": "Count and description", "estimated_cost": "Value or —"}
  ]
}"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": simple_prompt},
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
            max_tokens=2000,
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        analysis = json.loads(response.choices[0].message.content)

        # Ensure simplified_data exists
        if "simplified_data" not in analysis:
            analysis["simplified_data"] = []

        # Validate data
        analysis["simplified_data"] = self._validate_and_enhance_data(analysis["simplified_data"])

        # Add metadata
        analysis["analysis_timestamp"] = datetime.utcnow().isoformat()
        analysis["processing_time_seconds"] = time.time() - start_time
        analysis["model_used"] = f"{self.model} (fallback)"
        analysis["fallback_used"] = True

        return analysis

    def format_for_table(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format analysis data for table display"""

        if "error" in analysis:
            return []

        table_data = []

        # Process each category
        for category_data in analysis.get("analysis_data", []):
            category_name = category_data.get("category", "Unknown")

            for item in category_data.get("items", []):
                table_data.append({
                    "category": category_name,
                    "item": item.get("item", ""),
                    "details": item.get("details", ""),
                    "quantity": item.get("quantity", ""),
                    "condition": item.get("condition", ""),
                    "value": item.get("estimated_value", ""),
                    "notes": item.get("notes", "")
                })

        return table_data