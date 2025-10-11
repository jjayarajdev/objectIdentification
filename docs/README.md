# Room Intelligence & Object Detection System

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Documentation](#documentation)
5. [Features](#features)
6. [Technology Stack](#technology-stack)
7. [Contributing](#contributing)

## 🎯 Project Overview

The Room Intelligence & Object Detection System is a comprehensive AI-powered application designed for CBRE's property management and surveying needs. It provides automated scene analysis, object detection, cost estimation, and professional report generation using state-of-the-art technologies including OpenAI GPT-4 Vision and DSPy framework.

### Key Capabilities

- **🔍 Advanced Scene Analysis**: AI-powered room/property analysis with detailed categorization
- **📊 Object Detection & Counting**: Accurate identification of furniture, people, and infrastructure
- **💰 Cost Estimation**: Automated property valuation and item cost calculations
- **🤖 DSPy Integration**: Consistent prompting with structured output validation
- **📄 Report Generation**: Professional Word documents and comprehensive analysis reports
- **⚡ Batch Processing**: Multiple image analysis with concurrent processing

### Supported Scene Types

- Indoor Office Spaces
- Residential Properties
- Commercial Buildings
- Industrial Facilities
- Construction Sites
- Infrastructure & Parking Areas

## 🏗️ Architecture

The system follows a modern microservices architecture with clear separation of concerns:

```
├── backend/           # FastAPI backend with AI services
├── frontend/          # React.js frontend application
├── docs/             # Technical documentation
└── uploads/          # Image storage and processing
```

### Backend Architecture (Python/FastAPI)
- **API Layer**: FastAPI with async/await support
- **AI Services**: OpenAI GPT-4 Vision, DSPy framework
- **Data Layer**: SQLite with WAL mode, file storage
- **Middleware**: Transaction logging, CORS, authentication

### Frontend Architecture (React.js)
- **UI Components**: Modular React components
- **State Management**: React hooks and context
- **API Integration**: Axios for backend communication
- **Styling**: Tailwind CSS for responsive design

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API Key

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
export OPENAI_API_KEY="your-api-key"
python run.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Documentation Hub**: http://localhost:8000/documentation

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture Guide](./ARCHITECTURE.md) | System design and component overview |
| [API Reference](./API.md) | Complete API documentation |
| [DSPy Integration](./DSPY.md) | DSPy framework implementation details |
| [Frontend Guide](./FRONTEND.md) | React.js components and features |
| [Deployment Guide](./DEPLOYMENT.md) | Production deployment instructions |
| [Development Guide](./DEVELOPMENT.md) | Development workflow and guidelines |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common issues and solutions |

## ✨ Features

### Core Features
- **Multi-format Image Support**: JPG, JPEG, PNG, GIF
- **Real-time Analysis**: Live feedback during processing
- **Structured Data Output**: Consistent categorized results
- **Professional Reporting**: Word document generation
- **Transaction Logging**: Complete audit trail
- **Offline Capability**: Local storage and sync

### Advanced Features
- **DSPy Framework**: Structured prompting for consistency
- **Batch Processing**: Multiple image analysis
- **Cost Database**: Integrated pricing information
- **EXIF Metadata**: Camera settings and location data
- **Interactive Annotations**: Visual object highlighting
- **Export Options**: Multiple format support

## 🛠️ Technology Stack

### Backend Technologies
- **FastAPI**: High-performance async web framework
- **Python 3.11**: Modern Python with type hints
- **OpenAI GPT-4 Vision**: Advanced image understanding
- **DSPy Framework**: Structured AI prompting
- **SQLite**: Lightweight database with WAL mode
- **Pydantic**: Data validation and serialization
- **python-docx**: Word document generation

### Frontend Technologies
- **React.js 18**: Modern component-based UI
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Axios**: HTTP client for API communication
- **React Hooks**: State management and effects

### DevOps & Tools
- **Git**: Version control with conventional commits
- **ESLint**: JavaScript linting and formatting
- **PostCSS**: CSS processing and optimization
- **Claude Code**: AI-assisted development

## 🤝 Contributing

### Development Workflow

1. **Fork and Clone**: Create your development environment
2. **Branch Strategy**: Use feature branches for new work
3. **Code Standards**: Follow existing conventions and patterns
4. **Testing**: Ensure all features work as expected
5. **Documentation**: Update docs for new features
6. **Pull Request**: Submit with clear description

### Code Standards

- **Python**: Follow PEP 8, use type hints
- **JavaScript**: Use ES6+, follow ESLint rules
- **Git Commits**: Use conventional commit format
- **Documentation**: Update relevant docs for changes

### Project Structure

```
objectIdentification/
├── backend/
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── models.py       # Data models
│   │   └── main.py         # FastAPI app
│   ├── uploads/            # Image storage
│   ├── results/            # Generated reports
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api/           # API integration
│   │   └── utils/         # Helper functions
│   └── package.json       # Node dependencies
└── docs/                  # Technical documentation
```

---

**Version**: 1.0.0
**Last Updated**: October 2025
**Maintainer**: CBRE Object Identification Team