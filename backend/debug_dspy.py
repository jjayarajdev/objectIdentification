#!/usr/bin/env python3
"""
Debug script for DSPy Scene Analyzer
"""

import asyncio
import json
import base64
from pathlib import Path
from app.services.dspy_scene_analyzer import DSPySceneAnalysisService

async def debug_dspy():
    """Debug DSPy implementation with sample data"""

    # Initialize analyzer
    analyzer = DSPySceneAnalysisService()

    print("🔍 Testing DSPy Scene Analyzer...")

    # Test with a sample image (create a small test image if none exists)
    test_image_path = "test_image.jpg"

    # Check if we have any uploaded images to test with
    upload_dir = Path("uploads")
    if upload_dir.exists():
        image_files = list(upload_dir.glob("*.jpg")) + list(upload_dir.glob("*.jpeg")) + list(upload_dir.glob("*.png"))
        if image_files:
            test_image_path = str(image_files[0])
            print(f"📸 Using existing image: {test_image_path}")

    if not Path(test_image_path).exists():
        print(f"❌ No test image found at {test_image_path}")
        print("📁 Available files in uploads:")
        if upload_dir.exists():
            for file in upload_dir.iterdir():
                print(f"   - {file.name}")
        return

    try:
        print(f"\n🚀 Starting analysis of {test_image_path}...")

        # Run the analysis
        result = await analyzer.analyze_scene(Path(test_image_path))

        print(f"\n📊 Analysis Result:")
        print(f"Status: {result.get('status', 'Unknown')}")
        print(f"Analysis ID: {result.get('analysis_id', 'None')}")
        print(f"Scene Type: {result.get('scene_type', 'None')}")

        # Check simplified data
        simplified_data = result.get('simplified_data', [])
        print(f"\n📋 Simplified Data ({len(simplified_data)} items):")

        if simplified_data:
            for i, item in enumerate(simplified_data, 1):
                print(f"   {i}. Category: {item.get('category', 'N/A')}")
                print(f"      Object: {item.get('object', 'N/A')}")
                print(f"      Details: {item.get('details', 'N/A')[:50]}...")
                print(f"      Position: {item.get('position', 'N/A')}")
                print(f"      Cost: {item.get('estimated_cost', 'N/A')}")
                print()
        else:
            print("   ⚠️  No items found in simplified_data!")

        # Check raw response if available
        if 'raw_response' in result:
            print(f"\n🔧 Raw Response Length: {len(str(result['raw_response']))}")
            print(f"Raw Response Preview: {str(result['raw_response'])[:200]}...")

        # Check detailed analysis
        detailed_analysis = result.get('detailed_analysis', {})
        print(f"\n📝 Detailed Analysis Keys: {list(detailed_analysis.keys())}")

    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_dspy())