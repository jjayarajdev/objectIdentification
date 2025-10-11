# CBRE Property Analysis - AI-Powered Scene Recognition

A professional web application for property analysis using AI-powered scene recognition, GPS mapping, and comprehensive property assessment with automated report generation.

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-19.1-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)

## 🎯 Overview

CBRE Property Analysis is a modern, desktop-optimized web application designed for property surveyors and real estate professionals. It combines AI-powered scene recognition, GPS location mapping, and automated report generation to streamline property assessment workflows.

## ✨ Key Features

### 🏢 Property Analysis
- **AI Scene Recognition**: Automatically identifies property types (industrial, office, residential, etc.)
- **Comprehensive Analysis**: Detailed reports on infrastructure, facilities, and features
- **GPS Location Mapping**: Extract and display property location from EXIF data
- **Cost Estimation**: Estimated costs for detected items and features
- **Key Observations**: Automatically generated insights about the property

### 📸 Image Processing
- **Batch Upload**: Process up to 50 images at once
- **Drag & Drop**: Intuitive file upload interface
- **EXIF Metadata**: Extract camera settings, GPS coordinates, and timestamps
- **Image Gallery**: Horizontal carousel for easy navigation

### 📊 Data Management
- **Editable Tables**: In-line editing of detected items and features
- **Export to Word**: Professional report generation with embedded images
- **Batch Export**: Generate comprehensive reports for multiple properties
- **Customizable Data**: Add, edit, or remove detected items

### 🎨 Modern UI
- **Dark Theme**: Professional dark mode design inspired by v0.app
- **Teal Accents**: Clean, modern color scheme (#14b8a6)
- **Responsive Layout**: Optimized for desktop and widescreen displays
- **Three-Column View**: Image | Map | Overview for efficient information display
- **Collapsible Sections**: Expand/collapse analysis sections as needed

## 🖥️ User Interface

### Upload Screen
- Large drag-and-drop zone with hover effects
- Grid preview of selected images (6-column layout)
- Feature showcase cards
- Progress indicators during analysis

### Analysis Display
- **Horizontal Image Carousel**: Quick navigation between analyzed properties
- **Property Image**: Full-size display with EXIF data viewer
- **GPS Map**: Dark-themed Google Maps integration
- **Scene Overview**: Scrollable text panel with property context
- **Data Table**: Editable table with detected items and estimated costs
- **Key Observations**: Bullet-point list of important findings
- **Detailed Report**: Full narrative report in modal view

## 🚀 Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **OpenAI GPT-4o Vision**: AI-powered scene analysis
- **DSPy**: Structured LLM outputs
- **SQLite**: Transaction logging
- **Google Maps API**: Location services
- **Python 3.11+**

### Frontend
- **React 19**: Latest React with hooks
- **Vite 7**: Fast build tool
- **Tailwind CSS 4**: Utility-first CSS
- **docx**: Word document generation
- **exifr**: EXIF metadata extraction
- **Lucide React**: Icon library

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key
- Google Maps API key (optional, for mapping features)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/jjayarajdev/objectIdentification.git
cd objectIdentification
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure Environment**
Create `backend/.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here  # Optional
ALLOWED_ORIGINS=["http://localhost:5173"]
```

4. **Run Backend**
```bash
python run.py
```

5. **Frontend Setup** (new terminal)
```bash
cd frontend
npm install
npm run dev
```

6. **Access Application**
Open http://localhost:5173 in your browser

## 💼 Usage Guide

### Analyzing Properties

1. **Upload Images**
   - Drag and drop up to 50 images
   - Or click "Select Images" to browse
   - Review grid preview before processing

2. **Process Images**
   - Click "Analyze" button
   - Watch progress indicator
   - Results appear in horizontal carousel

3. **Review Analysis**
   - Select image from carousel
   - View property image, map, and overview
   - Review detected items table
   - Read key observations

4. **Edit Data**
   - Click edit icon on any table row
   - Modify category, details, or costs
   - Add new rows with "+ Add Row" button
   - Delete unwanted entries

5. **View Detailed Report**
   - Click "View Detailed Report" button
   - Read comprehensive narrative analysis
   - Download as Word document

6. **Export Results**
   - Single image: Click "Download as Word Document"
   - All results: Click "Export All to Word" in header
   - Professional report with embedded images generated

### Understanding Analysis Results

#### Scene Types
- `industrial_facility`: Manufacturing, plants, warehouses
- `indoor_office`: Office spaces, meeting rooms
- `building_exterior`: Building facades, structures
- `land_property`: Vacant land, plots
- `construction_site`: Active construction
- `infrastructure`: Roads, utilities, bridges
- `parking_area`: Parking lots, garages

#### Analysis Sections
1. **Property Context**: Location, terrain, construction materials
2. **Infrastructure & Access**: Roads, utilities, access points
3. **Facilities & Equipment**: Equipment, utilities, special features
4. **Condition & Observations**: Maintenance, safety, recommendations

## 🎨 UI Features

### Dark Theme
- Background: `#0a0a0a` (deep black)
- Cards: `#1a1a1a` (dark gray)
- Accents: `#14b8a6` (teal)
- Professional, modern aesthetic

### Interactive Elements
- Hover states on all buttons
- Smooth transitions
- Custom scrollbars
- Loading indicators
- Status badges (success/error)

### Responsive Design
- Maximum width: 1400px
- Horizontal layouts for widescreen
- Three-column grid system
- Collapsible sections for smaller screens

## 🔧 Configuration

### Backend (app/config.py)
```python
MAX_FILE_SIZE_MB = 20
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"]
INPUT_TOKEN_COST = 0.0025
OUTPUT_TOKEN_COST = 0.01
```

### Frontend
- Dark theme colors in Tailwind config
- Custom scrollbar styling
- Component-level configuration

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [API Documentation](docs/API.md) - Backend API reference
- [Frontend Guide](docs/FRONTEND.md) - Frontend components and features
- [Dark Theme UI](frontend/DARK_THEME_UI.md) - UI design specifications
- [Development Guide](docs/DEVELOPMENT.md) - Development workflow

## 🧪 Development

### Running Tests
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Building for Production
```bash
# Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Frontend
npm run build
npm run preview
```

## 📊 Project Structure

```
objectIdentification/
├── backend/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   ├── services/         # Business logic
│   │   └── main.py          # FastAPI app
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ModernDarkDashboard.jsx  # Main UI
│   │   │   ├── DarkSceneAnalysis.jsx    # Analysis display
│   │   │   └── ...
│   │   ├── utils/           # Helper functions
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── docs/                    # Documentation
```

## 🎯 Roadmap

- [ ] PDF export support
- [ ] Image annotations/markup
- [ ] Comparison view (before/after)
- [ ] Mobile-optimized layout
- [ ] Batch processing queue
- [ ] Cloud storage integration
- [ ] User authentication
- [ ] Report templates

## 🐛 Troubleshooting

### Common Issues

**Images not processing**
- Check OpenAI API key is valid
- Verify image format (JPEG, PNG supported)
- Check file size (<20MB)

**Map not displaying**
- Ensure Google Maps API key is configured
- Check image contains GPS EXIF data
- Verify API key has Maps JavaScript API enabled

**Export not working**
- Clear browser cache
- Check console for errors
- Verify all dependencies installed

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is proprietary software developed for CBRE.

## 👥 Authors

- Development Team - Initial work
- Claude Code - AI Assistant

## 🙏 Acknowledgments

- OpenAI for GPT-4o Vision API
- Google Maps for location services
- React and Vite communities
- FastAPI framework
- v0.app for UI inspiration

## 📞 Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/jjayarajdev/objectIdentification/issues
- Email: support@example.com

## 🔗 Links

- [GitHub Repository](https://github.com/jjayarajdev/objectIdentification)
- [API Documentation](http://localhost:8000/docs)
- [Project Wiki](https://github.com/jjayarajdev/objectIdentification/wiki)

---

**Built with ❤️ for CBRE Property Professionals**
