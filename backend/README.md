# Object Detection Backend API

FastAPI-based backend for image object detection using GPT-4o Vision, with EXIF metadata extraction and cost estimation.

## Features Implemented

✅ **Basic Setup**
- FastAPI application structure
- Modular router organization
- Configuration management with environment variables

✅ **Image Upload**
- Single image upload endpoint
- Batch/multiple image upload endpoint
- File validation (size and type)
- Secure file storage

✅ **EXIF Metadata**
- Complete EXIF data extraction
- Support for GPS coordinates
- Multiple extraction methods (Pillow + exifread)

🚧 **In Progress**
- GPT-4o Vision integration for object detection
- Token usage and cost estimation
- Export formats (JSON, YOLO, COCO, CSV)
- Batch processing with concurrency control

## Setup Instructions

### 1. Create Python Virtual Environment

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy the example environment file and add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_actual_api_key_here
```

### 4. Run the Backend

```bash
python run.py
```

Or use uvicorn directly:
```bash
uvicorn app.main:app --reload
```

The API will be available at:
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- OpenAPI Schema: http://localhost:8000/openapi.json

## API Endpoints

### Health Check
- `GET /health` - Check API health status

### Upload
- `POST /api/v1/upload` - Upload single image
- `POST /api/v1/upload-batch` - Upload multiple images

### EXIF Metadata
- `GET /api/v1/exif/{image_id}` - Get EXIF metadata for uploaded image

### Detection (To be implemented)
- `POST /api/v1/detect/{image_id}` - Detect objects in single image
- `POST /api/v1/detect/batch/{batch_id}` - Detect objects in batch

### Export (To be implemented)
- `GET /api/v1/export/{image_id}` - Export results in various formats
- `GET /api/v1/export/batch/{batch_id}` - Export batch results

## Testing the API

### Test Image Upload
```bash
curl -X POST "http://localhost:8000/api/v1/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/image.jpg"
```

### Test EXIF Extraction
```bash
curl -X GET "http://localhost:8000/api/v1/exif/{image_id}?file_extension=.jpg"
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application
│   ├── config.py        # Configuration settings
│   ├── models.py        # Pydantic models
│   ├── routers/         # API endpoints
│   │   ├── upload.py
│   │   ├── exif.py
│   │   ├── detection.py
│   │   ├── export.py
│   │   └── health.py
│   └── services/        # Business logic
│       ├── storage.py
│       ├── image_processor.py
│       └── exif_extractor.py
├── uploads/             # Uploaded images
├── results/             # Processing results
├── requirements.txt
├── .env.example
└── run.py
```

## Next Steps

1. Integrate GPT-4o Vision API for object detection
2. Implement token usage tracking and cost calculation
3. Add export functionality for different formats
4. Optimize batch processing with async/await
5. Add comprehensive error handling and logging