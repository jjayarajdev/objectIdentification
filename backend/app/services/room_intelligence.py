"""
Room Intelligence Analysis Service
Provides comprehensive room analysis including furniture, people, environment, and cost estimates
"""

import base64
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import asyncio
from openai import AsyncOpenAI
import time

from app.config import settings
from app.models import DetectedObject, BoundingBox


class RoomIntelligenceService:
    """Service for comprehensive room analysis using GPT-4o Vision"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = "gpt-4o"

        # Cost database for Indian market (in INR)
        self.cost_database = {
            "furniture": {
                "l_shaped_couch": {"min": 55000, "max": 85000},
                "single_couch": {"min": 25000, "max": 45000},
                "lounge_chair": {"min": 12000, "max": 25000},
                "office_chair": {"min": 8000, "max": 35000},
                "coffee_table_glass": {"min": 15000, "max": 30000},
                "coffee_table_wood": {"min": 20000, "max": 50000},
                "dining_table": {"min": 30000, "max": 80000},
                "office_desk": {"min": 15000, "max": 50000},
                "bookshelf": {"min": 10000, "max": 30000},
                "cabinet": {"min": 15000, "max": 40000}
            },
            "lighting": {
                "chandelier_modern": {"min": 15000, "max": 35000},
                "chandelier_crystal": {"min": 50000, "max": 200000},
                "pendant_light": {"min": 5000, "max": 15000},
                "recessed_light": {"min": 800, "max": 2500},
                "led_strip": {"min": 500, "max": 1500}
            },
            "flooring": {
                "carpet_tiles": {"min": 90, "max": 180, "unit": "per sq ft"},
                "wooden_flooring": {"min": 200, "max": 500, "unit": "per sq ft"},
                "marble": {"min": 100, "max": 400, "unit": "per sq ft"},
                "vinyl": {"min": 50, "max": 150, "unit": "per sq ft"}
            },
            "plants": {
                "areca_palm": {"min": 500, "max": 2000},
                "zz_plant": {"min": 400, "max": 1500},
                "pothos": {"min": 200, "max": 800},
                "snake_plant": {"min": 300, "max": 1000},
                "fiddle_leaf": {"min": 1500, "max": 4000}
            },
            "electronics": {
                "iphone": {"min": 60000, "max": 150000},
                "samsung_phone": {"min": 20000, "max": 120000},
                "oneplus": {"min": 30000, "max": 50000},
                "laptop": {"min": 40000, "max": 200000},
                "monitor": {"min": 10000, "max": 50000}
            }
        }

    def encode_image(self, image_path: Path) -> str:
        """Encode image to base64 for API transmission"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    async def analyze_room(self, image_path: Path) -> Dict[str, Any]:
        """
        Perform comprehensive room analysis

        Returns:
            Dictionary containing detailed room analysis
        """
        start_time = time.time()
        print(f"RoomIntelligenceService: Analyzing room from {image_path}")

        # Encode the image
        base64_image = self.encode_image(image_path)

        # Create comprehensive analysis prompt
        prompt = """You are an expert analyst for both indoor and outdoor spaces. Analyze this image and provide a COMPREHENSIVE report.

Your analysis MUST include ALL of the following categories:

1. **PEOPLE COUNT**
   - Exact count of people (standing, sitting, walking)
   - Their positions and activities
   - Gender distribution if clearly visible
   - Approximate age groups (child/adult/elderly)

2. **TEMPERATURE ESTIMATION**
   - Based on clothing, windows, visible HVAC
   - Estimate range in Celsius
   - Season indication
   - Comfort level assessment

3. **FURNITURE INVENTORY**
   List EVERY piece with:
   - Type and style
   - Material (leather, fabric, wood, metal)
   - Seating capacity
   - Brand estimate if recognizable
   - Condition (new/used/worn)

4. **LIGHTING ANALYSIS**
   For EACH light source:
   - Type (chandelier, recessed, pendant, LED strip, natural)
   - Style (modern, traditional, industrial)
   - Estimated wattage/brightness
   - Color temperature (warm/neutral/cool)
   - Number of fixtures

5. **HVAC & WINDOW TREATMENTS**
   - Air conditioning type (central, split, cassette, VRV)
   - Brand if visible
   - Window treatments (blinds, curtains, shades)
   - Material and operation type (manual/motorized)
   - Ventilation assessment

6. **FLOORING DETAILS**
   - Type (carpet, wood, tile, marble, vinyl)
   - Pattern/color
   - Material quality
   - Installation type (tiles/planks/rolls)
   - Condition assessment

7. **ELECTRONICS INVENTORY**
   - Mobile phones (count, possible brands based on shape)
   - Laptops/computers
   - Monitors/TVs
   - Other devices (tablets, smartwatches)
   - Charging cables/accessories

8. **PLANTS IDENTIFICATION**
   For EACH plant:
   - Common name and scientific name
   - Size (small/medium/large)
   - Container type
   - Health status
   - Maintenance level required

9. **COST ESTIMATION** (in Indian Rupees)
   Provide ranges for:
   - Each major furniture piece
   - Chandelier/major lighting
   - Flooring per sq ft
   - Plants
   - Total room setup estimate

10. **ROOM METRICS**
    - Approximate dimensions (length x width)
    - Ceiling height estimate
    - Total square footage
    - Occupancy capacity
    - Natural light assessment

11. **ADDITIONAL OBSERVATIONS**
    - Room purpose (office/lounge/conference/residential)
    - Design style (modern/traditional/minimalist)
    - Color scheme
    - Artwork/decorations
    - Storage solutions
    - Safety features (fire extinguisher, emergency exit)
    - Cleanliness level
    - Brand logos/company branding if visible

Return a detailed JSON with this EXACT structure:
{
  "people_analysis": {
    "total_count": number,
    "sitting": number,
    "standing": number,
    "details": "detailed description"
  },
  "temperature": {
    "estimated_range_celsius": {"min": number, "max": number},
    "hvac_setting": "string",
    "comfort_assessment": "string"
  },
  "furniture": [
    {
      "item": "string",
      "quantity": number,
      "material": "string",
      "style": "string",
      "estimated_cost_inr": {"min": number, "max": number},
      "condition": "string"
    }
  ],
  "lighting": [
    {
      "type": "string",
      "quantity": number,
      "style": "string",
      "estimated_cost_inr": {"min": number, "max": number}
    }
  ],
  "hvac_and_blinds": {
    "ac_type": "string",
    "brand": "string or unknown",
    "blinds_type": "string",
    "blinds_material": "string"
  },
  "flooring": {
    "type": "string",
    "material": "string",
    "pattern": "string",
    "cost_per_sqft_inr": {"min": number, "max": number},
    "total_area_sqft": number
  },
  "electronics": [
    {
      "device": "string",
      "brand_guess": "string",
      "quantity": number,
      "estimated_cost_inr": {"min": number, "max": number}
    }
  ],
  "plants": [
    {
      "common_name": "string",
      "scientific_name": "string",
      "size": "string",
      "estimated_cost_inr": {"min": number, "max": number}
    }
  ],
  "room_metrics": {
    "estimated_dimensions_feet": {"length": number, "width": number},
    "ceiling_height_feet": number,
    "total_area_sqft": number
  },
  "cost_summary": {
    "furniture_total": {"min": number, "max": number},
    "lighting_total": {"min": number, "max": number},
    "flooring_total": {"min": number, "max": number},
    "plants_total": {"min": number, "max": number},
    "complete_room_estimate": {"min": number, "max": number}
  },
  "room_classification": {
    "scene_type": "indoor or outdoor",
    "primary_use": "string",
    "design_style": "string",
    "formality_level": "string",
    "organization_type": "string"
  },
  "detailed_narrative": "Comprehensive paragraph describing the room, its purpose, ambiance, and notable features"
}

Be extremely detailed and specific. Count everything carefully. Provide realistic cost estimates for the Indian market."""

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
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            # Parse response
            analysis = json.loads(response.choices[0].message.content)

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
            print(f"Error in room analysis: {e}")
            import traceback
            traceback.print_exc()
            return {
                "error": str(e),
                "processing_time_seconds": time.time() - start_time
            }

    def format_analysis_for_display(self, analysis: Dict[str, Any]) -> str:
        """Format analysis into a beautiful markdown report"""

        if "error" in analysis:
            return f"❌ Analysis Error: {analysis['error']}"

        report = f"""# 📊 Comprehensive Room Intelligence Report

Generated: {analysis.get('analysis_timestamp', 'N/A')}

---

## 🧍 **People in the Room**

**Total Count:** {analysis['people_analysis']['total_count']} people
- Sitting: {analysis['people_analysis']['sitting']}
- Standing: {analysis['people_analysis']['standing']}

{analysis['people_analysis']['details']}

---

## 🌡️ **Environmental Conditions**

**Estimated Temperature:** {analysis['temperature']['estimated_range_celsius']['min']}°C - {analysis['temperature']['estimated_range_celsius']['max']}°C
- HVAC Setting: {analysis['temperature']['hvac_setting']}
- Comfort Level: {analysis['temperature']['comfort_assessment']}

---

## 🪑 **Furniture Inventory**

"""

        for item in analysis.get('furniture', []):
            report += f"""
### {item['item']}
- Quantity: {item['quantity']}
- Material: {item['material']}
- Style: {item['style']}
- Condition: {item['condition']}
- **Estimated Cost:** ₹{item['estimated_cost_inr']['min']:,} - ₹{item['estimated_cost_inr']['max']:,}
"""

        report += f"""
---

## 💡 **Lighting Systems**

"""
        for light in analysis.get('lighting', []):
            report += f"""
### {light['type']}
- Quantity: {light['quantity']}
- Style: {light['style']}
- **Estimated Cost:** ₹{light['estimated_cost_inr']['min']:,} - ₹{light['estimated_cost_inr']['max']:,}
"""

        report += f"""
---

## 🌬️ **HVAC & Window Treatments**

- **AC Type:** {analysis['hvac_and_blinds']['ac_type']}
- **Brand:** {analysis['hvac_and_blinds']['brand']}
- **Blinds:** {analysis['hvac_and_blinds']['blinds_type']}
- **Blinds Material:** {analysis['hvac_and_blinds']['blinds_material']}

---

## 🏢 **Flooring**

- **Type:** {analysis['flooring']['type']}
- **Material:** {analysis['flooring']['material']}
- **Pattern:** {analysis['flooring']['pattern']}
- **Cost:** ₹{analysis['flooring']['cost_per_sqft_inr']['min']} - ₹{analysis['flooring']['cost_per_sqft_inr']['max']} per sq ft
- **Total Area:** {analysis['flooring']['total_area_sqft']} sq ft

---

## 📱 **Electronics**

"""
        for device in analysis.get('electronics', []):
            report += f"""
### {device['device']}
- Possible Brand: {device['brand_guess']}
- Quantity: {device['quantity']}
- **Estimated Value:** ₹{device['estimated_cost_inr']['min']:,} - ₹{device['estimated_cost_inr']['max']:,}
"""

        report += f"""
---

## 🌿 **Plants**

"""
        for plant in analysis.get('plants', []):
            report += f"""
### {plant['common_name']}
- Scientific Name: *{plant['scientific_name']}*
- Size: {plant['size']}
- **Estimated Cost:** ₹{plant['estimated_cost_inr']['min']:,} - ₹{plant['estimated_cost_inr']['max']:,}
"""

        report += f"""
---

## 📐 **Room Metrics**

- **Dimensions:** {analysis['room_metrics']['estimated_dimensions_feet']['length']}' × {analysis['room_metrics']['estimated_dimensions_feet']['width']}'
- **Ceiling Height:** {analysis['room_metrics']['ceiling_height_feet']}'
- **Total Area:** {analysis['room_metrics']['total_area_sqft']} sq ft

---

## 💰 **Cost Summary**

| Category | Estimated Cost Range (INR) |
|----------|---------------------------|
| Furniture | ₹{analysis['cost_summary']['furniture_total']['min']:,} - ₹{analysis['cost_summary']['furniture_total']['max']:,} |
| Lighting | ₹{analysis['cost_summary']['lighting_total']['min']:,} - ₹{analysis['cost_summary']['lighting_total']['max']:,} |
| Flooring | ₹{analysis['cost_summary']['flooring_total']['min']:,} - ₹{analysis['cost_summary']['flooring_total']['max']:,} |
| Plants | ₹{analysis['cost_summary']['plants_total']['min']:,} - ₹{analysis['cost_summary']['plants_total']['max']:,} |
| **TOTAL ROOM SETUP** | **₹{analysis['cost_summary']['complete_room_estimate']['min']:,} - ₹{analysis['cost_summary']['complete_room_estimate']['max']:,}** |

---

## 🏢 **Room Classification**

- **Primary Use:** {analysis['room_classification']['primary_use']}
- **Design Style:** {analysis['room_classification']['design_style']}
- **Formality Level:** {analysis['room_classification']['formality_level']}
- **Organization Type:** {analysis['room_classification']['organization_type']}

---

## 📝 **Executive Summary**

{analysis['detailed_narrative']}

---

*Analysis completed in {analysis['processing_time_seconds']:.2f} seconds using {analysis['model_used']}*
"""

        return report