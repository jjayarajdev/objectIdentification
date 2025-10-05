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

        # If no data or empty list, return a default entry
        if not simplified_data or len(simplified_data) == 0:
            return [
                {
                    "identifier": "Scene Contents",
                    "details": "No specific items detected - manual entry required",
                    "estimated_cost": "—"
                }
            ]

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
        prompt = """You are an expert surveyor and property analyst. Analyze this image with EXTREME DETAIL and comprehensiveness.

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

Then provide an EXTREMELY DETAILED ANALYSIS. Be thorough and specific:

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

CRITICAL INSTRUCTIONS FOR DETAILED ANALYSIS:
1. Count EVERY visible object - be exhaustive, miss nothing
2. Describe positions precisely (e.g., "center", "bottom-right", "emerging from tunnel")
3. Note colors, materials, conditions, quantities for everything
4. Identify ALL infrastructure elements (cables, pipes, fixtures, signs)
5. Describe spatial relationships between objects
6. Note wear, damage, maintenance needs
7. Identify safety and compliance features
8. Be specific about quantities - count exact numbers when possible

Return a JSON with this structure:
{
  "scene_type": "type from list above",
  "scene_overview": "DETAILED 2-3 paragraph description covering all major elements, their relationships, condition, and purpose. Include architectural features, traffic flow, safety measures, and environmental context",
  "simplified_data": [
    {
      "identifier": "Category (People/Vehicles/Traffic Control/Signage/Building Elements/Plants/Infrastructure/etc)",
      "details": "SPECIFIC description with exact counts, colors, materials, positions. Example: '10 orange traffic cones, lined along driveway center and extending into tunnel'",
      "estimated_cost": "Cost range like '₹500-1000 each' or '—' if not applicable"
    }
  ],
  "narrative_report": "COMPREHENSIVE NARRATIVE REPORT in markdown format. Must be 500+ words with these sections:\n\n📍 **Scene Overview**\nDetailed 2-3 paragraph description of the entire scene, its purpose, condition, and context.\n\n🧍 **People & Activity**\nDetailed count, descriptions, activities, positions of all people visible.\n\n🚗 **Vehicles & Transportation**\nAll vehicles present, their type, color, position, condition.\n\n🚧 **Traffic Control & Safety**\nAll safety equipment, barriers, cones, signs, their arrangement and purpose.\n\n🏗️ **Structural Elements**\nWalls, tunnels, gates, doors, architectural features, materials, conditions.\n\n🌿 **Landscaping & Environment**\nPlants, trees, environmental features, their placement and condition.\n\n⚡ **Infrastructure & Utilities**\nCables, pipes, lighting, electrical systems, drainage, other utilities.\n\n📋 **Signage & Markings**\nAll signs, markings, labels, their content and positioning.\n\n🛤️ **Surfaces & Pavements**\nGround conditions, materials, wear patterns, maintenance needs.\n\n🔧 **Maintenance Observations**\nCracks, patches, wear, needed repairs, general upkeep status.\n\n✅ **Key Observations & Recommendations**\nBullet points of most important findings and any recommendations.",
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
    "Traffic cones play central role in path guidance for vehicles and pedestrians",
    "Multiple entry/exit points: one main vehicle tunnel and two smaller side doors",
    "Mixed-use environment: both vehicular and pedestrian flow through same space",
    "Architectural design is functional and minimal with grey walls and yellow interior accents",
    "Overhead cables indicate external wiring, likely temporary or for lighting/security",
    "Palm plants add minimal but deliberate greenery to concrete-heavy setting",
    "Visible wear and patching on driveway surface indicates regular heavy use",
    "Security features include gate numbering system and controlled access points"
  ],
  "estimated_property_value": {
    "min": number or null,
    "max": number or null,
    "basis": "explanation of value estimate"
  }
}

CRITICAL for simplified_data - BE EXHAUSTIVE:
- List EVERY distinct object/element visible - aim for 15-30+ rows for complex scenes
- Include exact counts, positions, colors, materials, conditions
- Categories to always check: People, Vehicles, Traffic Control, Signage, Structural Elements, Infrastructure, Plants/Landscaping, Surfaces/Pavements, Lighting, Safety Equipment, Doors/Windows, Utilities, Wall Features
- Format examples with position details:
  {"identifier": "People", "details": "3 pedestrians (2 women, 1 man) walking out of tunnel towards camera, center position", "estimated_cost": "—"}
  {"identifier": "Vehicle", "details": "1 silver sedan car, parked near right edge, partially in frame", "estimated_cost": "—"}
  {"identifier": "Traffic Control", "details": "10+ orange traffic cones lined along driveway center, extending into tunnel", "estimated_cost": "₹300-500 each"}
  {"identifier": "Signage", "details": "'Gate 3' dark rectangular sign on right wall near tunnel entrance", "estimated_cost": "₹5K-10K"}
  {"identifier": "Building Entry", "details": "Large rectangular tunnel/driveway opening, center of image, for parking/service entry", "estimated_cost": "—"}
  {"identifier": "Walls", "details": "Plain grey concrete walls on both sides, framing the tunnel entrance", "estimated_cost": "—"}
  {"identifier": "Overhead Infrastructure", "details": "Electrical cables running horizontally above gate, external wiring visible", "estimated_cost": "₹10K-20K"}
  {"identifier": "Plants", "details": "Palm trees/decorative plants on left parapet wall and right boundary", "estimated_cost": "₹5K-10K each"}
  {"identifier": "Pavement", "details": "Light grey concrete driveway with visible cracks, patches, slight incline", "estimated_cost": "₹500-800 per sq.m"}
  {"identifier": "Interior Infrastructure", "details": "Red pipes and light fixtures visible on tunnel ceiling", "estimated_cost": "—"}
  {"identifier": "Side Doors", "details": "2 small pedestrian doors flanking main tunnel (left and right)", "estimated_cost": "₹30K-50K each"}
  {"identifier": "Interior Wall Feature", "details": "Yellow painted section with line art on left interior tunnel wall", "estimated_cost": "—"}

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
                max_tokens=8000,  # Increased for more detailed responses
                temperature=0.3,  # Slightly higher for more comprehensive descriptions
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
            except Exception as fallback_error:
                print(f"Fallback analysis also failed: {fallback_error}")
                # Return a basic structure even on failure
                return {
                    "scene_type": "unknown",
                    "scene_overview": "Unable to analyze image. Please ensure the image is clear and try again.",
                    "simplified_data": [
                        {
                            "identifier": "Analysis Status",
                            "details": "Failed to process - please retry with a clearer image",
                            "estimated_cost": "—"
                        }
                    ],
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