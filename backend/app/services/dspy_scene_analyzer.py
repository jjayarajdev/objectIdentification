"""
DSPy-based Scene Analysis Service for Consistent Prompting
Uses structured signatures to ensure reliable and consistent scene analysis outputs
"""

import base64
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import time

import dspy
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.config import settings


# Define structured output models
class ObjectItem(BaseModel):
    category: str = Field(description="Standard category (People, Furniture, Lighting, Electronics, etc.)")
    object: str = Field(description="Object name with exact count (e.g., '3 Office Chairs')")
    details: str = Field(description="Detailed description with colors, materials, conditions")
    position: str = Field(description="Position in the image (e.g., 'Center of room', 'Left wall')")
    estimated_cost: str = Field(description="Estimated cost in INR or '—' if not applicable")


class SceneAnalysisResult(BaseModel):
    scene_type: str = Field(description="Scene type from predefined list")
    scene_overview: str = Field(description="Comprehensive 2-3 paragraph scene summary")
    simplified_data: List[ObjectItem] = Field(description="List of all detected objects with details")
    key_observations: List[str] = Field(description="5-8 key findings and recommendations")


# DSPy Signatures for structured prompting
class SceneTypeClassifier(dspy.Signature):
    """Classify the type of scene in the image"""

    image_description: str = dspy.InputField(desc="Description of what's visible in the image")
    scene_type: str = dspy.OutputField(desc="Scene type: indoor_office, indoor_residential, indoor_commercial, indoor_industrial, building_exterior, land_property, vacant_land, construction_site, infrastructure, parking_area, industrial_facility, agricultural_land, water_treatment_facility, power_station, warehouse_logistics, or other")


class SceneOverviewGenerator(dspy.Signature):
    """Generate comprehensive scene overview for property analysis"""

    image_description: str = dspy.InputField(desc="Detailed description of the image contents")
    scene_type: str = dspy.InputField(desc="Classified scene type")
    scene_overview: str = dspy.OutputField(desc="""Comprehensive 3-4 paragraph summary for property surveying covering:

Paragraph 1 - Property Context: Scene type, property identification (name/location if visible), topography (flat/uneven/slopes), land use (vacant/constructed/under-construction), construction type (residential/commercial/industrial), and visible construction materials.

Paragraph 2 - Infrastructure & Access: Road conditions (paved/unpaved, material, quality), access control measures, power infrastructure (lines/substations with capacity), water bodies and flood risks, retaining walls/bunding.

Paragraph 3 - Facilities & Equipment: Industrial equipment (chimneys, tanks, pipelines, loading docks), firefighting systems, utilities (water/sewage treatment), agricultural elements, waste/salvage materials, safety equipment and hazard indicators.

Paragraph 4 - Condition & Observations: Overall infrastructure quality and maintenance state, environmental concerns (undesirable surroundings), safety risks, visible documentation/signage/certifications, photographer distance from subjects, and any unique or critical findings.

Be specific about counts, materials, colors, conditions, capacities, and exact details observed. Include measurements, ratings, and technical specifications where visible.""")


class ObjectDetector(dspy.Signature):
    """Detect and catalog all objects in the scene with structured output"""

    image_description: str = dspy.InputField(desc="Detailed description of the image")
    scene_type: str = dspy.InputField(desc="Scene type for context")
    objects_json: str = dspy.OutputField(desc="""JSON array of objects with exact format:
[
  {
    "category": "People|Furniture|Lighting|Electronics|Flooring|Ceiling|Walls|Doors|Windows|Plants|Signage|Safety Equipment|HVAC|Storage|Infrastructure|Vehicle|Building Element|Land Features|Water Bodies|Power Infrastructure|Industrial Equipment|Firefighting|Utilities|Access Control|Construction Materials|Agricultural|Waste/Salvage|Documentation|Hazards",
    "object": "EXACT COUNT + Item name (e.g., '3 Office Chairs', '9 Individuals', '1 High-tension Power Line', '2 Chemical Storage Tanks')",
    "details": "Detailed description with colors, materials, conditions, capacity, safety status",
    "position": "Specific position in image",
    "estimated_cost": "Cost in INR format ₹X,XXX or '—'"
  }
]

CRITICAL RULES:
1. ONLY include objects that are EXPLICITLY mentioned in the image_description above
2. DO NOT invent, assume, or hallucinate objects not described
3. If the scene is indoor (indoor_office, indoor_residential, indoor_commercial), focus on:
   - People, Furniture, Lighting, Electronics, Walls, Floors, Ceilings, Windows, Doors, HVAC, Plants
4. If the scene is outdoor (land_property, construction_site, infrastructure), focus on:
   - Land features, vegetation, roads, buildings, vehicles, power infrastructure if visible
5. Match your detections to the scene_type provided
6. Count EVERYTHING that is actually visible and described
7. Aim for 15-40 entries depending on scene complexity
8. If an object type is not mentioned in the description, do not include it""")


class KeyObservationExtractor(dspy.Signature):
    """Extract key observations and recommendations for comprehensive property analysis"""

    scene_overview: str = dspy.InputField(desc="Scene overview")
    objects_data: str = dspy.InputField(desc="Detected objects information")
    key_observations: str = dspy.OutputField(desc="""JSON array of 10-15 bullet points covering:

1. Property Type & Location: Land parcel vs constructed property, construction type (residential/commercial/industrial), identifiable location/name
2. Topography & Land Features: Terrain characteristics (flat/uneven/slopes), land use/zoning indicators
3. Construction & Materials: Building materials identified, construction quality and state
4. Infrastructure Quality: Road conditions (paved/unpaved, quality), maintenance state, access quality
5. Water & Flood Risk: Water bodies proximity, flood risk indicators, retaining walls/bunding condition
6. Electrical Infrastructure: Power lines/substations present, estimated load capacity, electrical safety risks
7. Industrial Facilities: Industrial activity indicators, specialized equipment (chimneys, tanks, pipelines, loading docks)
8. Safety & Hazards: Fire safety equipment, hazard warnings, structural risks, environmental hazards
9. Access & Security: Access control measures, security infrastructure
10. Utilities: Water/sewage treatment facilities, waste management
11. Environmental Concerns: Undesirable surroundings (burial grounds, dumps), pollution indicators
12. Agricultural Activity: Farming evidence, crop types, irrigation systems
13. Salvage Value: Scrap materials, estimated salvage/recovery value
14. Documentation: Visible maps/certifications/approvals, regulatory compliance indicators
15. Distance & Measurements: Photographer distance from objects, scale indicators
16. Overall Recommendations: Maintenance needs, safety improvements, risk mitigation

Provide specific, actionable observations with exact details from the analysis.""")


# DSPy Module for Scene Analysis
class DSPySceneAnalyzer(dspy.Module):
    """Main DSPy module orchestrating the scene analysis pipeline"""

    def __init__(self):
        super().__init__()
        self.classify_scene = dspy.ChainOfThought(SceneTypeClassifier)
        self.generate_overview = dspy.ChainOfThought(SceneOverviewGenerator)
        self.detect_objects = dspy.ChainOfThought(ObjectDetector)
        self.extract_observations = dspy.ChainOfThought(KeyObservationExtractor)

    def forward(self, image_description: str) -> SceneAnalysisResult:
        """Process image description through the DSPy pipeline"""

        # Step 1: Classify scene type
        scene_classification = self.classify_scene(image_description=image_description)
        scene_type = scene_classification.scene_type

        # Step 2: Generate comprehensive overview
        overview_result = self.generate_overview(
            image_description=image_description,
            scene_type=scene_type
        )
        scene_overview = overview_result.scene_overview

        # Step 3: Detect and catalog objects
        objects_result = self.detect_objects(
            image_description=image_description,
            scene_type=scene_type
        )

        try:
            objects_data = json.loads(objects_result.objects_json)

            # Validate objects match scene type
            validated_objects = self._validate_objects(objects_data, scene_type, image_description)

            # Convert to ObjectItem models
            simplified_data = [ObjectItem(**obj) for obj in validated_objects]
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error parsing objects JSON: {e}")
            # Fallback to default structure
            simplified_data = [ObjectItem(
                category="General",
                object="Scene Contents",
                details="Object detection parsing failed - manual review required",
                position="—",
                estimated_cost="—"
            )]

        # Step 4: Extract key observations
        observations_result = self.extract_observations(
            scene_overview=scene_overview,
            objects_data=objects_result.objects_json
        )

        try:
            key_observations = json.loads(observations_result.key_observations)
        except (json.JSONDecodeError, Exception):
            key_observations = [
                "Comprehensive analysis completed",
                "Manual review recommended for detailed insights",
                "Standard safety and maintenance protocols apply"
            ]

        return SceneAnalysisResult(
            scene_type=scene_type,
            scene_overview=scene_overview,
            simplified_data=simplified_data,
            key_observations=key_observations
        )

    def _validate_objects(self, objects_data: List[Dict], scene_type: str, image_description: str) -> List[Dict]:
        """
        Validate detected objects match the scene type and image description.
        Filter out hallucinated or mismatched objects.
        """
        # Define inappropriate objects for indoor scenes
        indoor_scenes = ['indoor_office', 'indoor_residential', 'indoor_commercial', 'indoor_industrial']
        outdoor_objects = ['Power Infrastructure', 'Water Bodies', 'Agricultural', 'Land Features']
        outdoor_keywords = ['power line', 'substation', 'road', 'asphalt', 'tree', 'vegetation', 'pylon']

        # Define inappropriate objects for outdoor scenes
        outdoor_scenes = ['land_property', 'construction_site', 'infrastructure', 'parking_area',
                         'agricultural_land', 'vacant_land', 'industrial_facility', 'power_station']

        validated = []
        image_desc_lower = image_description.lower()

        for obj in objects_data:
            category = obj.get('category', '')
            object_name = obj.get('object', '').lower()
            details = obj.get('details', '').lower()

            # Check if this is an indoor scene with outdoor objects
            if scene_type in indoor_scenes:
                # Reject outdoor infrastructure objects
                if category in outdoor_objects:
                    print(f"Filtering out mismatched object for {scene_type}: {obj.get('object')}")
                    continue

                # Check for outdoor keywords in object name or details
                if any(keyword in object_name or keyword in details for keyword in outdoor_keywords):
                    print(f"Filtering out outdoor object for indoor scene: {obj.get('object')}")
                    continue

            # Verify object is mentioned in description (basic keyword check)
            obj_words = object_name.replace('1 ', '').replace('2 ', '').replace('3 ', '').split()
            obj_words = [w for w in obj_words if len(w) > 3]  # Filter short words

            if obj_words:
                # At least one significant word from object should appear in description
                if not any(word in image_desc_lower for word in obj_words[:2]):  # Check first 2 words
                    print(f"Object not found in description: {obj.get('object')}")
                    continue

            validated.append(obj)

        return validated if validated else [{
            "category": "General",
            "object": "Scene Analysis",
            "details": "No valid objects detected - scene may be minimal or validation too strict",
            "position": "—",
            "estimated_cost": "—"
        }]


class DSPySceneAnalysisService:
    """Service wrapper for DSPy-based scene analysis with OpenAI integration"""

    def __init__(self):
        # Configure DSPy with OpenAI
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

        # Configure DSPy LM with the new API
        import os
        os.environ['OPENAI_API_KEY'] = settings.openai_api_key

        lm = dspy.LM(
            model="openai/gpt-4o",
            max_tokens=4000,
            temperature=0.3
        )
        dspy.configure(lm=lm)

        # Initialize DSPy module
        self.dspy_analyzer = DSPySceneAnalyzer()

        # Traditional model for image description
        self.vision_model = "gpt-4o"

    def encode_image(self, image_path: Path) -> str:
        """Encode image to base64 for API transmission"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    async def _get_image_description(self, image_path: Path) -> str:
        """Get detailed image description using GPT-4 Vision"""
        base64_image = self.encode_image(image_path)

        description_prompt = """Provide a comprehensive, detailed description of this image for property analysis. Include:

**BASIC SCENE ANALYSIS:**
1. Overall scene and setting
2. All people present (count, activities, clothing, positions)
3. All furniture and equipment (exact counts, materials, colors, conditions)
4. All lighting sources (types, quantities, positions)
5. Structural elements (walls, floors, ceilings, doors, windows)
6. Any signage, plants, decorative elements
7. Infrastructure and utilities visible
8. Spatial layout and organization

**TOPOGRAPHY & LAND CHARACTERISTICS:**
9. Topography of the land and immediate surroundings (flat, uneven, slopes, terrain details)
10. Nature of the site (vacant land parcel, constructed property, under-construction)
11. If constructed: type of construction (residential, commercial office/retail, industrial, infrastructure)
12. Property name and location identifiable from signage or visual markers
13. Construction materials used (concrete, steel, brick, wood, glass, etc.)
14. For vacant land: any signage with specific details or ownership information
15. Land use or zoning indicators visible in the images

**INFRASTRUCTURE & ACCESS:**
16. Presence and condition of paved roads (asphalt, concrete, interlocking pavers)
17. For unpaved roads: condition (clean, potholed, broken, muddy)
18. Road quality and maintenance state
19. Access control measures (gates, barriers, security booths, fencing)

**WATER & FLOODING RISK:**
20. Water bodies in vicinity (rivers, lakes, ponds, drains, canals)
21. Signs of past flooding (water marks, debris lines, damage patterns)
22. Retaining walls or bunding around water bodies (type, condition, height)
23. Signage near water bodies (warnings, instructions, depth markers)

**ELECTRICAL & POWER INFRASTRUCTURE:**
24. High tension power lines visibility and proximity
25. Electrical substations or transformers present
26. Estimated electrical load from visible equipment (kVA ratings on transformers)
27. Electrical safety risks or hazards observed

**PROPERTY CONDITION & HAZARDS:**
28. Overall infrastructure quality and maintenance state
29. Visible risks or hazards (structural damage, exposed wiring, unsafe conditions)
30. Undesirable surroundings (burial grounds, garbage dumps, industrial pollutants)
31. Primary environmental or safety risks identified
32. Any hazard signage (fire warnings, chemical warnings, danger signs)

**INDUSTRIAL & SPECIALIZED FACILITIES:**
33. For industrial buildings: nature of activity from structural clues
34. Presence of chimneys, smoke stacks, emission points
35. Truck bays, loading docks, logistics infrastructure
36. Chemical or gas tanks and storage vessels
37. Pipelines (gas, chemical, water, oil)
38. Large oil storage tanks or fuel depots
39. Large parking areas and vehicle capacity

**SAFETY & FIREFIGHTING:**
40. Fire fighting equipment (hydrants, extinguishers, sprinkler systems, fire escapes)
41. Emergency exits and evacuation routes
42. Safety equipment and protective measures

**UTILITIES & TREATMENT:**
43. Sewage treatment plant presence and capacity indicators
44. Water treatment facilities
45. Waste management infrastructure

**DOCUMENTATION & SIGNAGE:**
46. Maps, certifications, or government documentation visible
47. Critical details from displayed documents (plot numbers, ownership, approvals)
48. Regulatory compliance indicators

**SPATIAL & MEASUREMENT:**
49. Visually estimated distance of photographer from major objects
50. Scale indicators for size estimation
51. Perspective and vantage point of the photograph

**AGRICULTURAL & LAND USE:**
52. Evidence of agricultural activity (crops, farming equipment, irrigation)
53. Type of agriculture if identifiable (commercial, subsistence)

**SALVAGE & MATERIALS:**
54. Scrap materials lying unattended
55. Perceived salvage value of abandoned materials
56. Reusable or recyclable materials visible

**GENERAL OBSERVATIONS:**
57. Condition and quality observations
58. Any safety or maintenance concerns visible
59. Unusual or noteworthy features

Be extremely detailed and specific with exact counts, measurements, materials, and descriptions. This description will be used for comprehensive property analysis and surveying."""

        try:
            response = await self.openai_client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": description_prompt},
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
                max_tokens=3000,
                temperature=0.1
            )

            return response.choices[0].message.content

        except Exception as e:
            print(f"Error getting image description: {e}")
            return "Unable to analyze image - please ensure the image is clear and accessible."

    async def analyze_scene(self, image_path: Path) -> Dict[str, Any]:
        """
        Perform DSPy-based scene analysis with consistent prompting

        Returns:
            Dictionary containing structured analysis results
        """
        start_time = time.time()
        print(f"DSPySceneAnalyzer: Analyzing scene from {image_path}")

        try:
            # Step 1: Get detailed image description using vision model
            image_description = await self._get_image_description(image_path)

            # Step 2: Process through DSPy pipeline for structured analysis
            analysis_result = self.dspy_analyzer(image_description=image_description)

            # Step 3: Convert to dictionary format matching original API
            analysis = {
                "scene_type": analysis_result.scene_type,
                "scene_overview": analysis_result.scene_overview,
                "simplified_data": [item.dict() for item in analysis_result.simplified_data],
                "key_observations": analysis_result.key_observations,

                # Additional metadata
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "processing_time_seconds": time.time() - start_time,
                "model_used": f"{self.vision_model} + DSPy",
                "dspy_pipeline_used": True,

                # Generate narrative report from structured data
                "narrative_report": self._generate_narrative_report(analysis_result),

                # Convert simplified_data to analysis_data format for compatibility
                "analysis_data": self._convert_to_analysis_data(analysis_result.simplified_data),

                # Placeholder for property value (could be enhanced with DSPy module)
                "estimated_property_value": {
                    "min": None,
                    "max": None,
                    "basis": "Property valuation requires additional context and comparable data"
                }
            }

            return analysis

        except Exception as e:
            print(f"Error in DSPy scene analysis: {e}")
            import traceback
            traceback.print_exc()

            # Fallback to basic structure
            return {
                "scene_type": "unknown",
                "scene_overview": "Unable to analyze image using DSPy pipeline. Please ensure the image is clear and try again.",
                "simplified_data": [
                    {
                        "category": "Analysis Status",
                        "object": "Processing Failed",
                        "details": "DSPy analysis pipeline encountered an error",
                        "position": "—",
                        "estimated_cost": "—"
                    }
                ],
                "key_observations": ["Analysis failed - manual review required"],
                "error": str(e),
                "processing_time_seconds": time.time() - start_time,
                "dspy_pipeline_used": False
            }

    def _generate_narrative_report(self, analysis_result: SceneAnalysisResult) -> str:
        """Generate narrative report from structured analysis"""

        # Group objects by category
        categories = {}
        for item in analysis_result.simplified_data:
            category = item.category
            if category not in categories:
                categories[category] = []
            categories[category].append(item)

        report_sections = [
            "## Detailed Property Survey Report",
            "",
            "### 📍 Scene Overview",
            analysis_result.scene_overview,
            ""
        ]

        # Add sections for each category
        category_icons = {
            "People": "🧍",
            "Furniture": "🪑",
            "Lighting": "💡",
            "Electronics": "💻",
            "Flooring": "🏗️",
            "Ceiling": "🏗️",
            "Walls": "🏗️",
            "Doors": "🚪",
            "Windows": "🪟",
            "Plants": "🌿",
            "Signage": "📋",
            "Safety Equipment": "🦺",
            "HVAC": "❄️",
            "Storage": "📦",
            "Infrastructure": "⚡",
            "Vehicle": "🚗",
            "Building Element": "🏗️",
            "Land Features": "🏔️",
            "Water Bodies": "💧",
            "Power Infrastructure": "⚡",
            "Industrial Equipment": "🏭",
            "Firefighting": "🧯",
            "Utilities": "🚰",
            "Access Control": "🚧",
            "Construction Materials": "🧱",
            "Agricultural": "🌾",
            "Waste/Salvage": "♻️",
            "Documentation": "📄",
            "Hazards": "⚠️"
        }

        for category, items in categories.items():
            icon = category_icons.get(category, "📋")
            report_sections.extend([
                f"### {icon} {category}",
                ""
            ])

            for item in items:
                report_sections.append(f"**{item.object}**: {item.details}")
                if item.position != "—":
                    report_sections.append(f"  - Position: {item.position}")
                if item.estimated_cost != "—":
                    report_sections.append(f"  - Cost: {item.estimated_cost}")
                report_sections.append("")

        # Add key findings
        report_sections.extend([
            "### ✅ Key Findings & Recommendations",
            ""
        ])

        for observation in analysis_result.key_observations:
            report_sections.append(f"- {observation}")

        return "\n".join(report_sections)

    def _convert_to_analysis_data(self, simplified_data: List[ObjectItem]) -> List[Dict[str, Any]]:
        """Convert simplified_data to analysis_data format for backward compatibility"""

        # Group by category
        categories = {}
        for item in simplified_data:
            category = item.category
            if category not in categories:
                categories[category] = []

            categories[category].append({
                "item": item.object,
                "details": item.details,
                "quantity": "N/A",  # Could extract from object field
                "condition": "N/A",  # Could extract from details
                "estimated_value": item.estimated_cost,
                "notes": f"Position: {item.position}" if item.position != "—" else ""
            })

        analysis_data = []
        for category, items in categories.items():
            analysis_data.append({
                "category": category,
                "items": items
            })

        return analysis_data

    def format_for_table(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format analysis data for table display (compatible with original interface)"""

        if "error" in analysis:
            return []

        table_data = []

        # Use simplified_data directly since it's already in the right format
        for item in analysis.get("simplified_data", []):
            table_data.append({
                "category": item.get("category", "Unknown"),
                "object": item.get("object", ""),
                "details": item.get("details", ""),
                "position": item.get("position", ""),
                "estimated_cost": item.get("estimated_cost", "")
            })

        return table_data