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
                    "category": "General",
                    "object": "Scene Contents",
                    "details": "No specific items detected - manual entry required",
                    "position": "—",
                    "estimated_cost": "—"
                }
            ]

        enhanced_data = []
        for item in simplified_data:
            # Support both new format and old format for backward compatibility
            if "category" in item and "object" in item:
                # New format - just ensure all fields are present
                enhanced_item = {
                    "category": item.get("category", "Unknown"),
                    "object": item.get("object", "Unknown"),
                    "details": item.get("details", ""),
                    "position": item.get("position", "—"),
                    "estimated_cost": item.get("estimated_cost", "—")
                }
            else:
                # Old format - convert to new format
                enhanced_item = {
                    "category": "Unknown",
                    "object": item.get("identifier", "Unknown"),
                    "details": item.get("details", ""),
                    "position": "—",
                    "estimated_cost": item.get("estimated_cost", "—")
                }


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
        prompt = """You are an expert surveyor analyzing property images. Provide a COMPREHENSIVE analysis with exact counts and specific details.

SCENE TYPE (choose one):
- indoor_office
- indoor_residential
- indoor_commercial
- indoor_industrial
- building_exterior
- land_property
- construction_site
- infrastructure
- parking_area
- other

ANALYSIS REQUIREMENTS:

1. **Comprehensive Summary** (2-3 paragraphs):
   - Overall scene description
   - Purpose and function of the space
   - Condition assessment
   - Notable features and characteristics

2. **Detailed Object Table**:
   Count EVERYTHING visible. Be exhaustive. Include:
   - EXACT counts (e.g., "9 Individuals", "3 Chairs", "1 Desk")
   - Specific descriptions with colors, materials, conditions
   - Precise positions in the image
   - Estimated costs in INR where applicable

   Categories to check:
   - People (count individuals, describe activities)
   - Furniture (desks, chairs, tables, cabinets, etc.)
   - Lighting (fixtures, lamps, natural light sources)
   - Electronics/Equipment (computers, monitors, printers, etc.)
   - Flooring/Ceiling (type, condition, materials)
   - Walls/Partitions (materials, colors, conditions)
   - Doors/Windows (count, type, materials)
   - Plants/Decor (indoor plants, artwork, decorations)
   - Signage (signs, labels, boards)
   - Safety/Security (cameras, alarms, emergency equipment)
   - HVAC (air conditioning, ventilation, heating)
   - Storage (shelves, racks, storage units)
   - Infrastructure (cables, pipes, electrical fixtures)
   - Vehicles (if parking/outdoor)
   - Building Elements (structural features)

3. **Key Observations** (5-8 bullet points):
   - Most important findings
   - Maintenance needs
   - Safety concerns
   - Recommendations

Return JSON with EXACTLY this structure:
{
  "scene_type": "type from list above",
  "scene_overview": "Comprehensive 2-3 paragraph summary describing the entire scene, its purpose, condition, spatial layout, and all notable features. Be specific about counts, materials, colors, and conditions.",
  "simplified_data": [
    {
      "category": "People",
      "object": "9 Individuals",
      "details": "Mix of men and women in business casual attire, engaged in various activities - 3 standing in discussion, 4 seated at desks working, 2 walking",
      "position": "Throughout the office space",
      "estimated_cost": "—"
    },
    {
      "category": "Furniture",
      "object": "1 Desk",
      "details": "Modern white laminate desk with metal legs, approximately 5ft x 3ft",
      "position": "Center of room",
      "estimated_cost": "₹15,000"
    },
    {
      "category": "Furniture",
      "object": "3 Office Chairs",
      "details": "Black ergonomic swivel chairs with armrests and lumbar support",
      "position": "At desk and nearby workstations",
      "estimated_cost": "₹24,000"
    },
    {
      "category": "Lighting",
      "object": "5 Ceiling Lights",
      "details": "Recessed LED panel lights, 2x2 ft, providing bright white illumination",
      "position": "Evenly distributed across ceiling",
      "estimated_cost": "₹25,000"
    }
  ],
  "narrative_report": "## Detailed Property Survey Report\n\n### 📍 Scene Overview\n[2-3 detailed paragraphs about the overall scene]\n\n### 🧍 People & Activity\n[Detailed description of all people, their activities, positioning]\n\n### 🪑 Furniture & Equipment\n[All furniture items with materials, conditions, arrangements]\n\n### 💡 Lighting & Electrical\n[Natural and artificial lighting, electrical fixtures]\n\n### 🏗️ Structural Elements\n[Walls, floors, ceilings, doors, windows, architectural features]\n\n### 🌿 Plants & Decor\n[Any plants, artwork, decorative elements]\n\n### ⚡ Infrastructure & Utilities\n[HVAC, cables, pipes, electrical systems]\n\n### 📋 Signage & Markings\n[All signs, labels, markings]\n\n### 🔧 Maintenance Observations\n[Condition assessments, wear, needed repairs]\n\n### ✅ Key Findings & Recommendations\n[Bullet points of important observations and suggestions]",
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
    "Well-lit modern office space with good natural light",
    "Mix of collaborative and individual work areas",
    "HVAC system appears well-maintained",
    "Some wear on flooring near high-traffic areas",
    "Adequate emergency exits and safety signage",
    "Cable management could be improved",
    "Space appears at 70% occupancy capacity"
  ],
  "estimated_property_value": {
    "min": number or null,
    "max": number or null,
    "basis": "explanation of value estimate"
  }
}

CRITICAL INSTRUCTIONS for simplified_data:
1. ALWAYS include exact counts in the "object" field (e.g., "9 Individuals" not just "Individuals")
2. Use standard categories: People, Furniture, Lighting, Electronics, Flooring, Ceiling, Walls, Doors, Windows, Plants, Signage, Safety, HVAC, Storage, Infrastructure, Vehicle, Building Element
3. Include estimated_cost in INR for items where applicable (use "—" if not applicable)
4. Be specific about positions (e.g., "Center of room", "Left wall", "Near entrance")
5. Provide detailed descriptions with colors, materials, conditions
6. List EVERY distinct item - aim for 15-30+ entries for detailed scenes
7. Count similar items together (e.g., "5 Ceiling Lights" not separate entries for each)

Examples of proper format:
- {"category": "People", "object": "3 Pedestrians", "details": "Two women and one man in casual clothing walking together", "position": "Center foreground", "estimated_cost": "—"}
- {"category": "Furniture", "object": "4 Workstations", "details": "Modular cubicles with grey panels, each with desk surface", "position": "Along north wall", "estimated_cost": "₹120,000"}
- {"category": "Electronics", "object": "6 Computer Monitors", "details": "24-inch LED displays, Dell brand, mounted on adjustable arms", "position": "On desks throughout", "estimated_cost": "₹90,000"}
- {"category": "Flooring", "object": "Vinyl Tile Flooring", "details": "Grey commercial-grade vinyl tiles, approximately 500 sq ft, showing some wear", "position": "Entire floor area", "estimated_cost": "₹75,000"}

Be thorough and professional. This analysis will be used for property valuation and facility management."""

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