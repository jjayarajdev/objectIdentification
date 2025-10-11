# Frontend Development Guide

## 🎨 Overview

The Room Intelligence frontend is built with React.js 18, providing a modern, responsive interface for image analysis and property surveying. The application emphasizes user experience with drag-and-drop uploads, real-time processing feedback, and interactive data visualization.

## 🏗️ Architecture

### Technology Stack
- **React.js 18**: Modern component-based UI framework
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API communication

### Project Structure
```
frontend/src/
├── components/           # Reusable React components
│   ├── ImageUpload.jsx      # File upload interface
│   ├── AnalysisDisplay.jsx  # Results visualization
│   ├── ObjectsTable.jsx     # Data table component
│   ├── SceneAnalysis.jsx    # Scene analysis view
│   ├── RoomAnalysis.jsx     # Room analysis interface
│   ├── SurveyorDashboard.jsx # Main dashboard
│   ├── GalleryViewer.jsx    # Image gallery
│   ├── CostTracker.jsx      # Cost tracking
│   └── Analytics.jsx        # Analytics dashboard
├── api/                  # API integration
│   └── api.js               # HTTP client configuration
├── utils/                # Helper functions
│   ├── exportService.js     # Export functionality
│   ├── offlineStorage.js    # Local storage management
│   └── syncService.js       # Data synchronization
├── App.jsx              # Main application component
└── main.jsx             # Application entry point
```

## 🧩 Core Components

### ImageUpload.jsx
**Purpose**: Handle file uploads with drag-and-drop support

**Key Features:**
- Drag-and-drop interface
- Multiple file support
- Real-time preview
- Progress tracking
- File validation

**Props:**
```javascript
{
  onUpload: (files) => void,        // File upload callback
  maxFiles: number,                 // Maximum files allowed
  acceptedFormats: string[],        // Allowed file types
  maxSize: number,                  // Maximum file size (bytes)
  showPreview: boolean              // Show image previews
}
```

**Usage:**
```jsx
<ImageUpload
  onUpload={handleImageUpload}
  maxFiles={5}
  acceptedFormats={['jpg', 'jpeg', 'png']}
  maxSize={50 * 1024 * 1024} // 50MB
  showPreview={true}
/>
```

### AnalysisDisplay.jsx
**Purpose**: Visualize analysis results with interactive features

**Key Features:**
- Structured data display
- Interactive object highlighting
- Export options
- Report generation controls
- Real-time updates

**State Management:**
```javascript
const [analysisData, setAnalysisData] = useState(null);
const [selectedObjects, setSelectedObjects] = useState([]);
const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid' | 'map'
```

### ObjectsTable.jsx
**Purpose**: Display detected objects in a structured table format

**Features:**
- Sortable columns
- Search and filtering
- Cost calculations
- Export to CSV/Excel
- Pagination for large datasets

**Column Configuration:**
```javascript
const columns = [
  { key: 'category', label: 'Category', sortable: true },
  { key: 'object', label: 'Object', sortable: true },
  { key: 'details', label: 'Details', searchable: true },
  { key: 'position', label: 'Position' },
  { key: 'estimated_cost', label: 'Cost', sortable: true }
];
```

### RoomAnalysis.jsx
**Purpose**: Main interface for room analysis workflow

**Workflow Steps:**
1. Image upload
2. Analysis processing
3. Results display
4. Report generation
5. Export options

**Component Structure:**
```jsx
function RoomAnalysis() {
  const [currentStep, setCurrentStep] = useState(1);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="room-analysis">
      <StepIndicator currentStep={currentStep} />
      {currentStep === 1 && <ImageUpload onUpload={handleUpload} />}
      {currentStep === 2 && <ProcessingIndicator />}
      {currentStep === 3 && <AnalysisDisplay data={analysisResults} />}
      {currentStep === 4 && <ReportGeneration data={analysisResults} />}
    </div>
  );
}
```

### SurveyorDashboard.jsx
**Purpose**: Main dashboard for property surveyors

**Dashboard Sections:**
- Recent analyses
- Quick actions
- Statistics overview
- Recent reports
- System status

## 🔧 State Management

### React Hooks Usage

**useState for Local State:**
```javascript
const [images, setImages] = useState([]);
const [analysisResults, setAnalysisResults] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
```

**useEffect for Side Effects:**
```javascript
useEffect(() => {
  // Load saved data on component mount
  const savedData = offlineStorage.get('analysisHistory');
  if (savedData) {
    setAnalysisHistory(savedData);
  }
}, []);

useEffect(() => {
  // Auto-save analysis results
  if (analysisResults) {
    offlineStorage.set('currentAnalysis', analysisResults);
  }
}, [analysisResults]);
```

**Custom Hooks:**
```javascript
// useAPI hook for API calls
function useAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callAPI = async (endpoint, options) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.request(endpoint, options);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { callAPI, loading, error };
}

// Usage in component
const { callAPI, loading, error } = useAPI();
const analyzeImage = async (file) => {
  const result = await callAPI('/api/room-analysis/analyze-room', {
    method: 'POST',
    data: { file, use_dspy: true }
  });
  setAnalysisResults(result);
};
```

## 🎨 Styling with Tailwind CSS

### Design System

**Color Palette:**
```css
/* Primary Colors */
.bg-primary: #667eea
.bg-primary-dark: #764ba2

/* Status Colors */
.text-success: #10b981
.text-warning: #f59e0b
.text-error: #ef4444

/* Neutral Colors */
.bg-gray-50: #f9fafb
.bg-gray-900: #111827
```

**Component Styling Examples:**
```jsx
// Card component
<div className="bg-white rounded-lg shadow-lg p-6 mb-4">
  <h3 className="text-lg font-semibold text-gray-900 mb-2">
    Analysis Results
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Content */}
  </div>
</div>

// Button variants
<button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
  Analyze Image
</button>

// Table styling
<table className="w-full border-collapse border border-gray-300">
  <thead className="bg-gray-50">
    <tr>
      <th className="border border-gray-300 px-4 py-2 text-left">Category</th>
      <th className="border border-gray-300 px-4 py-2 text-left">Object</th>
    </tr>
  </thead>
</table>
```

## 🌐 API Integration

### API Client Configuration

```javascript
// api/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for large file uploads
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
```

### API Service Methods

```javascript
// Room Analysis API
export const roomAnalysisAPI = {
  analyzeRoom: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_dspy', options.useDSPy || true);
    formData.append('generate_report', options.generateReport || true);

    const response = await api.post('/api/room-analysis/analyze-room', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  analyzeBatch: async (files, options = {}) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('generate_reports', options.generateReports || true);

    const response = await api.post('/api/room-analysis/analyze-batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  downloadReport: async (reportFilename) => {
    const response = await api.get(`/api/room-analysis/download-report/${reportFilename}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
```

## 📱 Responsive Design

### Breakpoint System
```javascript
// Tailwind breakpoints
const breakpoints = {
  sm: '640px',   // Small screens
  md: '768px',   // Medium screens
  lg: '1024px',  // Large screens
  xl: '1280px',  // Extra large screens
  '2xl': '1536px' // 2X large screens
};
```

### Responsive Components
```jsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <div key={item.id} className="bg-white rounded-lg shadow p-4">
      {/* Item content */}
    </div>
  ))}
</div>

// Mobile-first navigation
<nav className="hidden md:flex space-x-8">
  {/* Desktop navigation */}
</nav>
<div className="md:hidden">
  {/* Mobile navigation */}
</div>
```

## 🔄 Data Flow

### Component Communication
```javascript
// Parent to Child (Props)
<AnalysisDisplay
  data={analysisResults}
  onExport={handleExport}
  loading={isLoading}
/>

// Child to Parent (Callbacks)
const handleImageUpload = (files) => {
  setUploadedFiles(files);
  startAnalysis(files);
};

// Sibling Communication (Lifting State Up)
function App() {
  const [sharedState, setSharedState] = useState(null);

  return (
    <>
      <ComponentA onUpdate={setSharedState} />
      <ComponentB data={sharedState} />
    </>
  );
}
```

## 🎯 Performance Optimization

### Code Splitting
```javascript
// Lazy loading components
import { lazy, Suspense } from 'react';

const RoomAnalysis = lazy(() => import('./components/RoomAnalysis'));
const Analytics = lazy(() => import('./components/Analytics'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/analysis" element={<RoomAnalysis />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
```

### Memoization
```javascript
import { memo, useMemo, useCallback } from 'react';

// Memoized component
const ObjectsTable = memo(({ data, onSort }) => {
  const sortedData = useMemo(() => {
    return data.sort((a, b) => a.category.localeCompare(b.category));
  }, [data]);

  const handleSort = useCallback((column) => {
    onSort(column);
  }, [onSort]);

  return (
    <table>
      {/* Table content */}
    </table>
  );
});
```

## 🧪 Testing Strategy

### Unit Testing with Vitest
```javascript
// components/__tests__/ImageUpload.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImageUpload from '../ImageUpload';

describe('ImageUpload', () => {
  it('renders upload area', () => {
    render(<ImageUpload onUpload={vi.fn()} />);
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    const mockOnUpload = vi.fn();
    render(<ImageUpload onUpload={mockOnUpload} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button');

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockOnUpload).toHaveBeenCalledWith([file]);
  });
});
```

## 📦 Build and Deployment

### Vite Configuration
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000
  }
});
```

### Environment Variables
```javascript
// .env files
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Room Intelligence
VITE_VERSION=1.0.0
```

---

This frontend architecture provides a solid foundation for the Room Intelligence application with modern React patterns, responsive design, and excellent user experience.