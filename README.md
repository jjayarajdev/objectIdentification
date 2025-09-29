# Object Detection Web Application

An advanced web application for object detection using OpenAI's GPT-4o Vision API with comprehensive image analysis, bounding box visualization, and metadata extraction.

## Features

### Core Functionality
- **AI-Powered Object Detection**: Uses GPT-4o Vision API to detect and identify objects in images
- **Precise Bounding Boxes**: Visual overlay showing detected objects with colored bounding boxes
- **Individual Instance Detection**: Detects and counts multiple instances of the same object type (e.g., multiple chairs, tables)
- **Confidence Scores**: Shows detection confidence for each identified object

### Image Processing
- **Single & Batch Upload**: Support for individual images or multiple images at once
- **Drag & Drop Interface**: Intuitive file upload with preview
- **Gallery View**: Navigate through multiple processed images with thumbnails
- **EXIF Metadata Extraction**: Extracts camera settings, GPS location, and other metadata

### Data Management
- **Multiple Export Formats**:
  - JSON (complete data structure)
  - YOLO format (for training models)
  - COCO dataset format
  - CSV (tabular data)
- **Filtering & Sorting**: Advanced table with search, category filters, and sorting options
- **Cost Tracking**: Real-time token usage and cost estimation ($0.0025/1K input, $0.01/1K output)

### User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Interactive Visualizations**:
  - Zoom in/out on images
  - Toggle bounding boxes on/off
  - Hover effects for object details
- **Collapsible Sidebar**: Hide/show metadata and token usage information
- **Real-time Badges**: Display token usage, cost, and EXIF data overlaid on images

## Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **Python 3.11+**: Core backend language
- **OpenAI API**: GPT-4o Vision for object detection
- **Pillow & exifread**: Image processing and metadata extraction
- **Pydantic**: Data validation and settings management
- **uvicorn**: ASGI server

### Frontend
- **React 18**: UI framework with hooks
- **Vite**: Fast build tool and dev server
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS v4**: Utility-first CSS framework
- **React Dropzone**: File upload handling
- **Lucide React**: Icon library

## Installation

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher
- OpenAI API key

### Backend Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd objectIdentification
```

2. Set up Python virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file in backend directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
ALLOWED_ORIGINS=["http://localhost:5173"]
MAX_FILE_SIZE_MB=10
ALLOWED_EXTENSIONS=[".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"]
INPUT_TOKEN_COST=0.0025
OUTPUT_TOKEN_COST=0.01
```

5. Run the backend server:
```bash
python run.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd ../frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in frontend directory:
```env
VITE_API_URL=http://localhost:8000
```

4. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

### Uploading Images

1. **Single Upload**: Click "Select Image" or drag and drop one image
2. **Batch Upload**: Click "Select Images" or drag and drop multiple images (up to 10)
3. Wait for processing - the AI will detect objects and draw bounding boxes

### Viewing Results

- **Bounding Boxes**: Colored boxes around detected objects with labels and confidence scores
- **Objects Table**: Comprehensive list with filtering and sorting options
- **Image Analysis**: Detailed AI-generated description of the scene
- **Metadata**: Camera settings, GPS location (if available), token usage, and cost

### Interacting with Results

- **Zoom**: Use zoom controls to examine details
- **Toggle Boxes**: Show/hide bounding boxes
- **Filter Objects**: Search by name or filter by category
- **Export Data**: Download results in your preferred format

### Keyboard Shortcuts
- `Space`: Toggle bounding boxes
- `+/-`: Zoom in/out
- `Arrow keys`: Navigate between images in gallery view

## API Endpoints

### Main Endpoints
- `POST /api/v1/upload`: Upload single image
- `POST /api/v1/upload-batch`: Upload multiple images
- `GET /api/v1/exif/{image_id}`: Get EXIF metadata
- `POST /api/v1/export/{format}`: Export detection results

### Documentation
- API docs: `http://localhost:8000/docs`
- OpenAPI spec: `http://localhost:8000/openapi.json`

## Architecture

### Object Detection Pipeline
1. Image uploaded to backend
2. Image encoded to base64
3. Sent to GPT-4o Vision API with detailed prompt
4. AI returns detected objects with bounding boxes (x, y, width, height as percentages)
5. Backend processes response and calculates costs
6. Frontend renders bounding boxes using SVG overlay

### Bounding Box System
- Coordinates provided by GPT-4o as percentages (0-100)
- SVG overlay ensures pixel-perfect alignment
- Responsive design maintains accuracy at different zoom levels
- Color-coded by object category

## Configuration

### Backend Configuration (`backend/app/config.py`)
- `MAX_FILE_SIZE_MB`: Maximum file size (default: 10MB)
- `ALLOWED_EXTENSIONS`: Supported image formats
- `INPUT_TOKEN_COST`: Cost per 1K input tokens
- `OUTPUT_TOKEN_COST`: Cost per 1K output tokens

### Frontend Configuration
- API URL configured via environment variable
- Tailwind CSS customization in `tailwind.config.js`

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production

Backend:
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Frontend:
```bash
cd frontend
npm run build
npm run preview
```

## Troubleshooting

### Common Issues

1. **Bounding boxes not showing**
   - Ensure GPT-4o API is returning coordinates
   - Check browser console for errors
   - Verify image dimensions are calculated correctly

2. **Batch upload not processing**
   - Check backend logs for errors
   - Ensure all images are valid formats
   - Verify API rate limits

3. **EXIF data not displaying**
   - Not all images contain EXIF metadata
   - Some image formats don't support EXIF

4. **High costs**
   - Large images use more tokens
   - Consider resizing images before upload
   - Monitor token usage in real-time

## Performance Optimization

- Images are processed with "high" detail setting for accuracy
- Batch processing handles up to 10 images concurrently
- Frontend uses React.memo and useMemo for optimization
- SVG rendering for efficient bounding box display

## Security Considerations

- API key stored in environment variables
- CORS configured for specific origins
- File type validation on upload
- Size limits to prevent abuse

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Specify your license here]

## Acknowledgments

- OpenAI for GPT-4o Vision API
- React and Vite communities
- FastAPI framework
- All open-source contributors

## Support

For issues, questions, or suggestions, please open an issue on GitHub.