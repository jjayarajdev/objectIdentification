# Development Guide

## 🚀 Getting Started

### Prerequisites

**Required Software:**
- Python 3.11+
- Node.js 18+
- Git 2.0+
- OpenAI API Key

**Recommended Tools:**
- VS Code with Python and React extensions
- Postman for API testing
- Git GUI client (optional)

### Environment Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd objectIdentification
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Configuration**
   ```bash
   # Backend .env file
   echo "OPENAI_API_KEY=your-api-key-here" > backend/.env
   echo "ENVIRONMENT=development" >> backend/.env

   # Frontend .env file
   echo "VITE_API_URL=http://localhost:8000" > frontend/.env
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend && source venv/bin/activate && python run.py

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

## 🏗️ Project Structure

### Backend Structure
```
backend/
├── app/                    # Main application package
│   ├── __init__.py
│   ├── main.py            # FastAPI application
│   ├── config.py          # Configuration settings
│   ├── models.py          # Pydantic data models
│   ├── database.py        # Database connection
│   ├── middleware.py      # Custom middleware
│   ├── routers/           # API route definitions
│   │   ├── __init__.py
│   │   ├── health.py         # Health check endpoints
│   │   ├── upload.py         # File upload handling
│   │   ├── room_analysis.py  # Room analysis API
│   │   ├── detection.py      # Object detection API
│   │   ├── export.py         # Data export API
│   │   ├── exif.py          # EXIF metadata API
│   │   ├── transactions.py   # Transaction logging
│   │   └── config.py        # Configuration API
│   └── services/          # Business logic layer
│       ├── __init__.py
│       ├── scene_analyzer.py        # Traditional scene analysis
│       ├── dspy_scene_analyzer.py   # DSPy-based analysis
│       ├── gpt_vision.py           # OpenAI integration
│       ├── report_generator.py     # Document generation
│       ├── storage.py              # File management
│       ├── image_processor.py      # Image processing
│       ├── exif_extractor.py       # Metadata extraction
│       ├── room_intelligence.py    # Room analysis logic
│       └── bbox_validator.py       # Bounding box validation
├── uploads/               # Image storage directory
├── results/               # Generated reports storage
├── debug_dspy.py         # DSPy debugging script
├── run.py                # Application entry point
└── requirements.txt      # Python dependencies
```

### Frontend Structure
```
frontend/
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── AnalysisDisplay.jsx     # Results visualization
│   │   ├── Analytics.jsx           # Analytics dashboard
│   │   ├── CostTracker.jsx         # Cost tracking
│   │   ├── ExifMetadata.jsx        # EXIF data display
│   │   ├── GalleryViewer.jsx       # Image gallery
│   │   ├── ImageAnnotator.jsx      # Image annotation
│   │   ├── ImageUpload.jsx         # File upload interface
│   │   ├── ImageWithBoundingBoxes.jsx  # Annotated images
│   │   ├── ImageWithBoundingBoxesSVG.jsx
│   │   ├── ObjectsList.jsx         # Objects list view
│   │   ├── ObjectsTable.jsx        # Data table
│   │   ├── PhotoLocationViewer.jsx # Location display
│   │   ├── RoomAnalysis.jsx        # Room analysis UI
│   │   ├── SceneAnalysis.jsx       # Scene analysis view
│   │   ├── SceneAnalysisWithMap.jsx
│   │   └── SurveyorDashboard.jsx   # Main dashboard
│   ├── api/              # API integration
│   │   └── api.js           # HTTP client
│   ├── utils/            # Utility functions
│   │   ├── exportService.js    # Export functionality
│   │   ├── offlineStorage.js   # Local storage
│   │   └── syncService.js      # Data synchronization
│   ├── App.jsx           # Main application component
│   └── main.jsx          # Application entry point
├── package.json          # Node dependencies
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS config
└── postcss.config.js     # PostCSS configuration
```

## 🛠️ Development Workflow

### Git Workflow

**Branch Naming Convention:**
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/component-name` - Code refactoring
- `docs/section-name` - Documentation updates

**Commit Message Format:**
```
type(scope): description

feat(dspy): add structured prompting for scene analysis
fix(upload): resolve file size validation error
docs(api): update endpoint documentation
refactor(components): simplify state management
```

**Development Process:**
1. Create feature branch from `main`
2. Implement changes with tests
3. Commit with conventional message format
4. Push branch and create pull request
5. Code review and merge

### Code Style Guidelines

**Python (Backend):**
- Follow PEP 8 style guide
- Use type hints for all functions
- Maximum line length: 88 characters
- Use docstrings for classes and functions

```python
def analyze_scene(
    image_path: Path,
    use_dspy: bool = True
) -> Dict[str, Any]:
    """
    Analyze scene in the given image.

    Args:
        image_path: Path to the image file
        use_dspy: Whether to use DSPy for analysis

    Returns:
        Dictionary containing analysis results

    Raises:
        FileNotFoundError: If image file doesn't exist
        ValueError: If image format is not supported
    """
    pass
```

**JavaScript/React (Frontend):**
- Use ES6+ features
- Prefer functional components with hooks
- Use camelCase for variables and functions
- Use PascalCase for component names

```javascript
// Component naming
const ImageUpload = () => { };

// Function naming
const handleImageUpload = (files) => { };

// Variable naming
const analysisResults = useState(null);
```

### Testing Strategy

**Backend Testing:**
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_scene_analyzer.py
```

**Frontend Testing:**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- ImageUpload.test.jsx
```

### Code Quality Tools

**Python:**
```bash
# Code formatting
black app/

# Import sorting
isort app/

# Linting
flake8 app/

# Type checking
mypy app/
```

**JavaScript:**
```bash
# Linting
npm run lint

# Formatting
npm run format

# Type checking (if using TypeScript)
npm run type-check
```

## 🔧 Configuration Management

### Environment Variables

**Backend (.env):**
```env
# Core Configuration
OPENAI_API_KEY=your-api-key-here
ENVIRONMENT=development
HOST=127.0.0.1
PORT=8000
RELOAD=true

# Storage Configuration
UPLOAD_FOLDER=uploads
RESULTS_FOLDER=results
MAX_FILE_SIZE=52428800  # 50MB

# CORS Configuration
CORS_ORIGINS=["http://localhost:3000"]

# Database Configuration
DATABASE_URL=sqlite:///./surveyor_transactions.db
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Room Intelligence
VITE_VERSION=1.0.0
VITE_MAX_FILE_SIZE=52428800
```

### Configuration Files

**Backend Config (app/config.py):**
```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    openai_api_key: str
    environment: str = "development"
    host: str = "127.0.0.1"
    port: int = 8000
    reload: bool = True
    cors_origins: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()
```

## 🐛 Debugging

### Backend Debugging

**Using Python Debugger:**
```python
import pdb; pdb.set_trace()  # Set breakpoint

# Or use ipdb for enhanced debugging
import ipdb; ipdb.set_trace()
```

**Logging Configuration:**
```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
logger.debug("Debug message")
```

**DSPy Debugging:**
```bash
# Run DSPy debug script
python debug_dspy.py
```

### Frontend Debugging

**Browser DevTools:**
- Use React DevTools extension
- Check Console for errors
- Use Network tab for API calls
- Use Application tab for local storage

**Debug React Components:**
```javascript
// Add debug logging
console.log('Component state:', state);
console.log('Props:', props);

// Use React strict mode in development
<React.StrictMode>
  <App />
</React.StrictMode>
```

## 🚦 API Development

### Adding New Endpoints

1. **Create Router Function:**
   ```python
   # app/routers/new_feature.py
   from fastapi import APIRouter, HTTPException

   router = APIRouter()

   @router.post("/new-endpoint")
   async def new_endpoint(data: RequestModel):
       try:
           result = process_data(data)
           return {"success": True, "result": result}
       except Exception as e:
           raise HTTPException(status_code=500, detail=str(e))
   ```

2. **Register Router:**
   ```python
   # app/main.py
   from app.routers import new_feature

   app.include_router(
       new_feature.router,
       prefix="/api/v1",
       tags=["New Feature"]
   )
   ```

3. **Add Frontend API Call:**
   ```javascript
   // src/api/api.js
   export const newFeatureAPI = {
     newEndpoint: async (data) => {
       const response = await api.post('/api/v1/new-endpoint', data);
       return response.data;
     }
   };
   ```

### Testing API Endpoints

**Using curl:**
```bash
# Test room analysis
curl -X POST "http://localhost:8000/api/room-analysis/analyze-room" \
  -F "file=@test.jpg" \
  -F "use_dspy=true"
```

**Using Postman:**
1. Import OpenAPI spec from `/openapi.json`
2. Set up environment variables
3. Test endpoints with sample data

## 🔒 Security Considerations

### Input Validation
```python
# Validate file uploads
def validate_upload(file: UploadFile):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Invalid file type")
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large")
```

### Error Handling
```python
# Don't expose internal errors
try:
    result = process_sensitive_data()
except InternalError as e:
    logger.error(f"Internal error: {e}")
    raise HTTPException(500, "Processing failed")
```

### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

## 📊 Performance Optimization

### Backend Optimization
- Use async/await for I/O operations
- Implement request/response compression
- Add caching for repeated operations
- Optimize database queries

### Frontend Optimization
- Implement lazy loading for components
- Use React.memo for expensive components
- Optimize bundle size with code splitting
- Implement proper error boundaries

### Monitoring
```python
# Add timing middleware
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

## 🚀 Deployment Preparation

### Production Build
```bash
# Backend
pip freeze > requirements.txt

# Frontend
npm run build
```

### Environment Preparation
- Set production environment variables
- Configure SSL certificates
- Set up database backups
- Configure monitoring and logging

## 📝 Documentation Updates

When adding new features:

1. **Update API Documentation** (`docs/API.md`)
2. **Update Architecture Documentation** (`docs/ARCHITECTURE.md`)
3. **Add Component Documentation** (`docs/FRONTEND.md`)
4. **Update README** with new features
5. **Add inline code comments**

## 🤝 Contributing Guidelines

1. **Fork the repository**
2. **Create a feature branch**
3. **Follow code style guidelines**
4. **Add tests for new functionality**
5. **Update documentation**
6. **Submit pull request with clear description**

---

This development guide provides the foundation for contributing to and maintaining the Room Intelligence system.