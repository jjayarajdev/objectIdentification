# API Reference

## 📖 Overview

The Room Intelligence & Object Detection API provides comprehensive endpoints for image analysis, object detection, and report generation. Built with FastAPI, it offers high-performance async operations with automatic OpenAPI documentation.

## 🌐 Base URLs

- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com`

## 📚 Interactive Documentation

- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`
- **Documentation Hub**: `/documentation`

## 🔐 Authentication

Currently using API key authentication for OpenAI integration. Future versions will implement user authentication.

## 📋 API Endpoints

### Health & Status

#### `GET /health`
Check API health and status

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-07T14:30:00Z",
  "version": "1.0.0",
  "openai_configured": true
}
```

---

### Room Analysis

#### `POST /api/room-analysis/analyze-room`
Perform comprehensive room analysis on uploaded image

**Parameters:**
- `file`: Image file (multipart/form-data)
- `generate_report`: Boolean (default: true)
- `use_dspy`: Boolean (default: true) - Use DSPy for consistent prompting

**Request:**
```bash
curl -X POST "http://localhost:8000/api/room-analysis/analyze-room" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@room.jpg" \
  -F "generate_report=true" \
  -F "use_dspy=true"
```

**Response:**
```json
{
  "image_id": "uuid-string",
  "filename": "room.jpg",
  "image_url": "/uploads/uuid.jpg",
  "scene_type": "indoor_office",
  "scene_overview": "Comprehensive description...",
  "simplified_data": [
    {
      "category": "Furniture",
      "object": "3 Office Chairs",
      "details": "Black ergonomic chairs in good condition",
      "position": "Around central table",
      "estimated_cost": "₹15,000"
    }
  ],
  "key_observations": [
    "Well-maintained office space",
    "Modern furniture in good condition"
  ],
  "report_url": "/reports/analysis_uuid.docx",
  "processing_time_seconds": 12.5,
  "model_used": "gpt-4o + DSPy",
  "dspy_pipeline_used": true
}
```

#### `POST /api/room-analysis/analyze-batch`
Analyze multiple room images in batch

**Parameters:**
- `files`: Array of image files
- `generate_reports`: Boolean (default: true)

**Request:**
```bash
curl -X POST "http://localhost:8000/api/room-analysis/analyze-batch" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@room1.jpg" \
  -F "files=@room2.jpg" \
  -F "generate_reports=true"
```

**Response:**
```json
{
  "success": true,
  "analyzed": 2,
  "results": [
    {
      "image_id": "uuid1",
      "filename": "room1.jpg",
      "scene_type": "indoor_office",
      "simplified_data": [...],
      "report_url": "/reports/analysis_uuid1.docx"
    },
    {
      "image_id": "uuid2",
      "filename": "room2.jpg",
      "scene_type": "indoor_residential",
      "simplified_data": [...],
      "report_url": "/reports/analysis_uuid2.docx"
    }
  ]
}
```

#### `POST /api/room-analysis/custom-analysis`
Perform custom analysis with specific parameters

**Parameters:**
- `file`: Image file
- `analysis_params`: JSON string with custom parameters

**Request:**
```bash
curl -X POST "http://localhost:8000/api/room-analysis/custom-analysis" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@room.jpg" \
  -F 'analysis_params={"categories": ["Furniture", "Lighting"]}'
```

#### `GET /api/room-analysis/download-report/{report_filename}`
Download generated Word report

**Parameters:**
- `report_filename`: Name of the report file

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename=report.docx`

#### `POST /api/room-analysis/generate-scene-report`
Generate Word document report for scene analysis

**Request Body:**
```json
{
  "scene_overview": "Detailed scene description...",
  "simplified_data": [...],
  "key_observations": [...],
  "image_url": "/uploads/image.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "report_url": "/api/room-analysis/download-report/scene_analysis_20251007_143000_abc123.docx",
  "report_filename": "scene_analysis_20251007_143000_abc123.docx"
}
```

---

### File Upload

#### `POST /api/v1/upload`
Upload image files for processing

**Parameters:**
- `files`: Array of image files
- `tags`: Optional tags (JSON string)

**Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "files=@image.jpg" \
  -F 'tags=["office", "survey"]'
```

**Response:**
```json
{
  "success": true,
  "uploaded_files": [
    {
      "filename": "image.jpg",
      "file_id": "uuid-string",
      "url": "/uploads/uuid.jpg",
      "size": 2048576,
      "type": "image/jpeg"
    }
  ]
}
```

---

### Object Detection

#### `POST /api/v1/detect`
Perform object detection on uploaded image

**Parameters:**
- `file`: Image file
- `confidence_threshold`: Float (0.0-1.0, default: 0.5)

**Response:**
```json
{
  "image_id": "uuid-string",
  "detected_objects": [
    {
      "label": "chair",
      "confidence": 0.95,
      "bbox": [100, 150, 200, 300],
      "category": "Furniture"
    }
  ],
  "total_objects": 5,
  "processing_time": 3.2
}
```

---

### EXIF Metadata

#### `POST /api/v1/exif`
Extract EXIF metadata from image

**Response:**
```json
{
  "camera_make": "Canon",
  "camera_model": "EOS R5",
  "datetime": "2025:10:07 14:30:00",
  "gps_coordinates": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "image_dimensions": {
    "width": 4096,
    "height": 2160
  },
  "technical_details": {
    "iso": 200,
    "aperture": "f/5.6",
    "shutter_speed": "1/125",
    "focal_length": "85mm"
  }
}
```

---

### Export & Reports

#### `POST /api/v1/export`
Export analysis data in various formats

**Request Body:**
```json
{
  "analysis_data": {...},
  "format": "json|csv|excel",
  "include_images": false
}
```

**Response:**
```json
{
  "success": true,
  "download_url": "/exports/analysis_export.json",
  "format": "json",
  "file_size": 1024
}
```

---

### Configuration

#### `GET /config`
Get current system configuration

**Response:**
```json
{
  "version": "1.0.0",
  "max_file_size": "50MB",
  "supported_formats": ["jpg", "jpeg", "png", "gif"],
  "features": {
    "dspy_enabled": true,
    "batch_processing": true,
    "report_generation": true
  },
  "models": {
    "vision_model": "gpt-4o",
    "dspy_configured": true
  }
}
```

#### `POST /config`
Update system configuration (admin only)

**Request Body:**
```json
{
  "max_file_size": "100MB",
  "vision_model": "gpt-4-vision-preview"
}
```

---

### Transaction Logging

#### `GET /transactions`
Get transaction history and analytics

**Query Parameters:**
- `limit`: Number of records (default: 100)
- `offset`: Pagination offset (default: 0)
- `start_date`: ISO datetime string
- `end_date`: ISO datetime string

**Response:**
```json
{
  "total": 1250,
  "transactions": [
    {
      "id": 1,
      "timestamp": "2025-10-07T14:30:00Z",
      "method": "POST",
      "endpoint": "/api/room-analysis/analyze-room",
      "status_code": 200,
      "processing_time": 12.5,
      "metadata": {
        "file_size": 2048576,
        "model_used": "gpt-4o + DSPy"
      }
    }
  ],
  "analytics": {
    "average_processing_time": 8.7,
    "total_images_processed": 342,
    "success_rate": 0.98
  }
}
```

---

## 📊 Data Models

### ObjectItem
```json
{
  "category": "string",      // Standard category
  "object": "string",        // Object name with count
  "details": "string",       // Detailed description
  "position": "string",      // Position in image
  "estimated_cost": "string" // Cost in INR format
}
```

### SceneAnalysisResult
```json
{
  "scene_type": "string",           // Scene classification
  "scene_overview": "string",       // Comprehensive summary
  "simplified_data": [ObjectItem],  // Array of detected objects
  "key_observations": ["string"]    // Key findings list
}
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid file format. Supported formats: jpg, jpeg, png, gif",
  "code": "INVALID_FILE_FORMAT"
}
```

### 413 Request Entity Too Large
```json
{
  "error": "Payload Too Large",
  "message": "File size exceeds maximum limit of 50MB",
  "code": "FILE_TOO_LARGE"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred during processing",
  "code": "INTERNAL_ERROR",
  "request_id": "uuid-string"
}
```

---

## 🚀 Rate Limits

- **File Upload**: 10 requests/minute per IP
- **Analysis**: 5 requests/minute per IP
- **Batch Processing**: 2 requests/minute per IP
- **Export**: 20 requests/minute per IP

---

## 💡 Usage Examples

### Python Client Example
```python
import requests

# Upload and analyze image
files = {'file': open('room.jpg', 'rb')}
data = {'use_dspy': True, 'generate_report': True}

response = requests.post(
    'http://localhost:8000/api/room-analysis/analyze-room',
    files=files,
    data=data
)

result = response.json()
print(f"Scene Type: {result['scene_type']}")
print(f"Objects Found: {len(result['simplified_data'])}")
```

### JavaScript/Node.js Example
```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('file', fs.createReadStream('room.jpg'));
form.append('use_dspy', 'true');

fetch('http://localhost:8000/api/room-analysis/analyze-room', {
  method: 'POST',
  body: form
})
.then(response => response.json())
.then(data => {
  console.log('Scene Type:', data.scene_type);
  console.log('Objects Found:', data.simplified_data.length);
});
```

### cURL Examples
```bash
# Basic room analysis
curl -X POST "http://localhost:8000/api/room-analysis/analyze-room" \
  -F "file=@room.jpg" \
  -F "use_dspy=true"

# Batch processing
curl -X POST "http://localhost:8000/api/room-analysis/analyze-batch" \
  -F "files=@room1.jpg" \
  -F "files=@room2.jpg"

# Download report
curl -O "http://localhost:8000/api/room-analysis/download-report/analysis_123.docx"
```

---

This comprehensive API reference provides everything needed to integrate with the Room Intelligence system.