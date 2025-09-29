# Object Detection Frontend

React-based frontend for image object detection with GPT-4o Vision, EXIF metadata extraction, and cost tracking.

## 🚀 Features Implemented

### ✅ Core Components
- **Image Upload** - Drag & drop interface for single/batch uploads
- **Gallery Viewer** - Navigate through uploaded images with thumbnails
- **EXIF Metadata Display** - Complete metadata extraction and display
- **Cost Tracker** - Real-time token usage and cost calculation
- **Export Options** - Multiple format support (JSON, YOLO, COCO, CSV)

### 🎨 UI Features
- Modern, responsive design with TailwindCSS
- Single/Batch upload mode toggle
- Interactive gallery with navigation
- Real-time processing status
- Error handling and feedback

## 📦 Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool for fast development
- **TailwindCSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls
- **React Dropzone** - Drag & drop file uploads
- **Lucide React** - Beautiful icon library

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 16+ installed
- Backend API running on http://localhost:8000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## 📁 Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── api.js           # API service layer
│   ├── components/
│   │   ├── ImageUpload.jsx  # Drag & drop upload
│   │   ├── GalleryViewer.jsx # Image gallery
│   │   ├── ExifMetadata.jsx # EXIF display
│   │   └── CostTracker.jsx  # Token & cost tracking
│   ├── App.jsx              # Main application
│   ├── index.css           # Tailwind directives
│   └── main.jsx            # Entry point
├── public/                  # Static assets
├── tailwind.config.js      # Tailwind configuration
└── vite.config.js          # Vite configuration
```

## 🎯 Current Status

### Working Features
- ✅ Image upload (single and batch)
- ✅ Gallery viewer with navigation
- ✅ EXIF metadata extraction and display
- ✅ Cost tracking UI (ready for data)
- ✅ Responsive layout

### Pending Backend Integration
- ⏳ GPT-4o Vision object detection
- ⏳ Actual cost calculations
- ⏳ Bounding box visualization
- ⏳ Export functionality

## 🔌 API Endpoints Used

- `POST /api/v1/upload` - Single image upload
- `POST /api/v1/upload-batch` - Batch image upload
- `GET /api/v1/exif/{image_id}` - Get EXIF metadata
- `POST /api/v1/detect/{image_id}` - Object detection (pending)
- `GET /api/v1/export/{image_id}` - Export results (pending)

## 🎨 Screenshots

### Upload Interface
- Drag & drop area
- Single/Batch mode toggle
- File type validation

### Gallery View
- Image display with navigation
- Thumbnail strip
- File information

### Metadata Panel
- Camera information
- Image settings
- GPS coordinates (when available)

### Cost Tracker
- Input/Output token counts
- Cost per image
- Total batch cost

## 📝 Usage

1. **Upload Images**
   - Click or drag images to upload area
   - Toggle between single/batch mode
   - Supports JPG, PNG, WebP (max 20MB)

2. **View Results**
   - Navigate through images in gallery
   - View EXIF metadata for each image
   - Monitor token usage and costs

3. **Export Data**
   - Choose export format
   - Download results for analysis

## 🔄 Next Steps

1. Complete GPT-4o Vision integration in backend
2. Implement bounding box visualization
3. Add real token usage tracking
4. Enable export functionality
5. Add image preprocessing options
6. Implement caching for better performance

## 🐛 Known Issues

- Export buttons are placeholders (backend not implemented)
- Token/cost data shows zeros (awaiting GPT-4o integration)
- "Add More Images" button needs refinement

## 📄 License

This project is part of the CBRE Object Identification system.