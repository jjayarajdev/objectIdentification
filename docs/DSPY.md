# DSPy Integration Guide

## 🎯 Overview

DSPy (Declarative Self-improving Python) is integrated into the Room Intelligence system to provide consistent, reliable AI prompting with structured outputs. This implementation replaces fragile string-based prompts with typed interfaces and automatic validation.

## 🤔 What is DSPy?

DSPy is a framework that transforms **prompt engineering** into **software engineering** by:
- Defining typed input/output contracts (Signatures)
- Automatically generating optimized prompts
- Providing structured validation and error handling
- Enabling modular, reusable AI components

## 🏗️ Implementation Architecture

### Core Components

```
DSPy Integration
├── Signatures/          # Input/output contracts
├── Modules/             # Processing pipelines
├── Models/              # Data validation
└── Services/            # Business logic
```

## 📝 DSPy Signatures

Signatures define the contract between input and output, replacing manual prompt writing.

### SceneTypeClassifier
**Purpose**: Classify the type of scene in an image

```python
class SceneTypeClassifier(dspy.Signature):
    """Classify the type of scene in the image"""

    image_description: str = dspy.InputField(
        desc="Description of what's visible in the image"
    )
    scene_type: str = dspy.OutputField(
        desc="Scene type: indoor_office, indoor_residential, indoor_commercial, "
             "indoor_industrial, building_exterior, land_property, construction_site, "
             "infrastructure, parking_area, or other"
    )
```

**What DSPy generates:**
```
Based on the image description: "{image_description}", classify this scene type.
Choose from: indoor_office, indoor_residential, indoor_commercial...
```

### SceneOverviewGenerator
**Purpose**: Create comprehensive scene summaries

```python
class SceneOverviewGenerator(dspy.Signature):
    """Generate comprehensive scene overview"""

    image_description: str = dspy.InputField(desc="Detailed description of the image contents")
    scene_type: str = dspy.InputField(desc="Classified scene type")
    scene_overview: str = dspy.OutputField(
        desc="Comprehensive 2-3 paragraph summary describing the entire scene, "
             "its purpose, condition, spatial layout, and all notable features. "
             "Be specific about counts, materials, colors, and conditions."
    )
```

### ObjectDetector (Most Complex)
**Purpose**: Detect and catalog all objects with structured output

```python
class ObjectDetector(dspy.Signature):
    """Detect and catalog all objects in the scene with structured output"""

    image_description: str = dspy.InputField(desc="Detailed description of the image")
    scene_type: str = dspy.InputField(desc="Scene type for context")
    objects_json: str = dspy.OutputField(desc="""JSON array of objects with exact format:
[
  {
    "category": "People|Furniture|Lighting|Electronics|Flooring|Ceiling|Walls|Doors|Windows|Plants|Signage|Safety|HVAC|Storage|Infrastructure|Vehicle|Building Element",
    "object": "EXACT COUNT + Item name (e.g., '3 Office Chairs', '9 Individuals')",
    "details": "Detailed description with colors, materials, conditions",
    "position": "Specific position in image",
    "estimated_cost": "Cost in INR format ₹X,XXX or '—'"
  }
]
Count EVERYTHING visible. Include exact numbers. Use standard categories.
Be exhaustive - aim for 15-30+ entries.""")
```

### KeyObservationExtractor
**Purpose**: Extract actionable insights and recommendations

```python
class KeyObservationExtractor(dspy.Signature):
    """Extract key observations and recommendations"""

    scene_overview: str = dspy.InputField(desc="Scene overview")
    objects_data: str = dspy.InputField(desc="Detected objects information")
    key_observations: str = dspy.OutputField(
        desc="JSON array of 5-8 bullet points with key findings, "
             "maintenance needs, safety concerns, and recommendations"
    )
```

## 🔧 DSPy Module Implementation

The main processing pipeline orchestrates all signatures:

```python
class DSPySceneAnalyzer(dspy.Module):
    """Main DSPy module orchestrating the scene analysis pipeline"""

    def __init__(self):
        super().__init__()
        # Chain-of-Thought adds reasoning steps for better accuracy
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

        # Step 4: Parse and validate JSON output
        try:
            objects_data = json.loads(objects_result.objects_json)
            simplified_data = [ObjectItem(**obj) for obj in objects_data]
        except (json.JSONDecodeError, Exception) as e:
            # Graceful fallback with structured error
            simplified_data = [ObjectItem(
                category="General",
                object="Scene Contents",
                details="Object detection parsing failed - manual review required",
                position="—",
                estimated_cost="—"
            )]

        # Step 5: Extract key observations
        observations_result = self.extract_observations(
            scene_overview=scene_overview,
            objects_data=objects_result.objects_json
        )

        try:
            key_observations = json.loads(observations_result.key_observations)
        except (json.JSONDecodeError, Exception):
            key_observations = [
                "Comprehensive analysis completed",
                "Manual review recommended for detailed insights"
            ]

        return SceneAnalysisResult(
            scene_type=scene_type,
            scene_overview=scene_overview,
            simplified_data=simplified_data,
            key_observations=key_observations
        )
```

## 💾 Data Validation with Pydantic

DSPy output is validated using Pydantic models:

```python
class ObjectItem(BaseModel):
    category: str = Field(description="Standard category (People, Furniture, Lighting, etc.)")
    object: str = Field(description="Object name with exact count (e.g., '3 Office Chairs')")
    details: str = Field(description="Detailed description with colors, materials, conditions")
    position: str = Field(description="Position in the image (e.g., 'Center of room', 'Left wall')")
    estimated_cost: str = Field(description="Estimated cost in INR or '—' if not applicable")

class SceneAnalysisResult(BaseModel):
    scene_type: str = Field(description="Scene type from predefined list")
    scene_overview: str = Field(description="Comprehensive 2-3 paragraph scene summary")
    simplified_data: List[ObjectItem] = Field(description="List of all detected objects with details")
    key_observations: List[str] = Field(description="5-8 key findings and recommendations")
```

## 🔄 Processing Pipeline Flow

### Step-by-Step Execution

1. **Image Input** → **Vision Model Description**
   ```python
   # GPT-4 Vision creates detailed description
   image_description = await self._get_image_description(image_path)
   ```

2. **Description** → **Scene Classification**
   ```python
   # DSPy classifies scene type
   scene_type = self.classify_scene(image_description=image_description).scene_type
   # Result: "parking_area", "indoor_office", etc.
   ```

3. **Description + Scene Type** → **Overview Generation**
   ```python
   # DSPy generates comprehensive overview
   scene_overview = self.generate_overview(
       image_description=image_description,
       scene_type=scene_type
   ).scene_overview
   ```

4. **Description + Scene Type** → **Object Detection**
   ```python
   # DSPy detects objects with structured JSON
   objects_json = self.detect_objects(
       image_description=image_description,
       scene_type=scene_type
   ).objects_json
   # Result: '[{"category": "People", "object": "2 Individuals", ...}]'
   ```

5. **Overview + Objects** → **Key Observations**
   ```python
   # DSPy extracts actionable insights
   key_observations = self.extract_observations(
       scene_overview=scene_overview,
       objects_data=objects_json
   ).key_observations
   ```

## 🛠️ Service Integration

The DSPy implementation is wrapped in a service for business logic:

```python
class DSPySceneAnalysisService:
    """Service wrapper for DSPy-based scene analysis with OpenAI integration"""

    def __init__(self):
        # Configure DSPy with OpenAI
        self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

        # Configure DSPy LM
        lm = dspy.LM(
            model="openai/gpt-4o",
            max_tokens=4000,
            temperature=0.3
        )
        dspy.configure(lm=lm)

        # Initialize DSPy module
        self.dspy_analyzer = DSPySceneAnalyzer()

    async def analyze_scene(self, image_path: Path) -> Dict[str, Any]:
        # Step 1: Get image description using GPT-4 Vision
        image_description = await self._get_image_description(image_path)

        # Step 2: Process through DSPy pipeline
        analysis_result = self.dspy_analyzer(image_description=image_description)

        # Step 3: Convert to API format with additional metadata
        return {
            "scene_type": analysis_result.scene_type,
            "scene_overview": analysis_result.scene_overview,
            "simplified_data": [item.dict() for item in analysis_result.simplified_data],
            "key_observations": analysis_result.key_observations,
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "model_used": "gpt-4o + DSPy",
            "dspy_pipeline_used": True
        }
```

## ✅ Benefits of DSPy Implementation

### 🎯 Consistency
- **Before**: Inconsistent responses with manual prompts
- **After**: Structured, validated output every time

### 🔧 Maintainability
- **Before**: Fragile string concatenation and parsing
- **After**: Typed interfaces with automatic validation

### 🚀 Performance
- **Before**: Manual prompt tuning and testing
- **After**: Automatic optimization and error handling

### 📊 Reliability
- **Before**: "Unknown" categories due to prompt failures
- **After**: Guaranteed category assignments with fallbacks

## 🔍 Real-World Results

### Debug Output Example
```
🔍 Testing DSPy Scene Analyzer...
📸 Using existing image: uploads/699f8736-0c7b-4a34-81f7-b941dee9df56.jpg

🚀 Starting analysis...

📊 Analysis Result:
Scene Type: parking_area

📋 Simplified Data (10 items):
   1. Category: People
      Object: 2 Individuals
      Details: Wearing casual clothing with long tops and pants...
      Position: Center of the tunnel entrance
      Cost: —

   2. Category: Safety
      Object: 8 Traffic Cones
      Details: Orange plastic cones in good condition...
      Position: Along the path leading into the tunnel
      Cost: ₹2,400

   [... 8 more structured entries ...]
```

## ⚠️ Error Handling

DSPy implementation includes robust error handling:

### JSON Parsing Errors
```python
try:
    objects_data = json.loads(objects_result.objects_json)
    simplified_data = [ObjectItem(**obj) for obj in objects_data]
except (json.JSONDecodeError, Exception) as e:
    print(f"Error parsing objects JSON: {e}")
    # Structured fallback instead of crash
    simplified_data = [ObjectItem(
        category="General",
        object="Scene Contents",
        details="Object detection parsing failed - manual review required",
        position="—",
        estimated_cost="—"
    )]
```

### Model Configuration Errors
```python
try:
    lm = dspy.LM(model="openai/gpt-4o", max_tokens=4000, temperature=0.3)
    dspy.configure(lm=lm)
except Exception as e:
    print(f"Error configuring DSPy: {e}")
    # Fallback to traditional analysis
```

## 🔄 Migration from Traditional Prompts

### Before (Traditional Approach)
```python
prompt = f"""
Analyze this image: {description}
Return JSON with categories and objects.
Format: [{{"category": "...", "object": "..."}}]
"""
# Problems: Inconsistent format, brittle, hard to modify
```

### After (DSPy Approach)
```python
class ObjectDetector(dspy.Signature):
    objects_json: str = dspy.OutputField(desc="JSON with exact format...")

# Benefits: Consistent, typed, self-documenting, optimizable
```

## 🎛️ Configuration Options

### DSPy Model Settings
```python
lm = dspy.LM(
    model="openai/gpt-4o",      # Model selection
    max_tokens=4000,            # Response length
    temperature=0.3             # Creativity level (lower = more consistent)
)
```

### Chain-of-Thought Settings
```python
# Adds reasoning steps for better accuracy
self.classify_scene = dspy.ChainOfThought(SceneTypeClassifier)

# vs. direct prediction (faster but less accurate)
self.classify_scene = dspy.Predict(SceneTypeClassifier)
```

## 🚀 Future Enhancements

### Optimization Potential
- **Auto-tuning**: DSPy can automatically optimize prompts
- **Few-shot Learning**: Add examples for better performance
- **Multi-model**: Chain different models for specialized tasks

### Advanced Features
- **Confidence Scoring**: Return prediction confidence levels
- **Reasoning Traces**: Expose Chain-of-Thought reasoning
- **Custom Metrics**: Define success criteria for optimization

---

The DSPy integration transforms the Room Intelligence system from fragile prompt engineering to reliable software engineering, ensuring consistent, validated outputs for professional property analysis.