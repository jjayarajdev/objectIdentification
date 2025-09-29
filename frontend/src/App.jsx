import React, { useState, useEffect } from 'react';
import ImageUpload from './components/ImageUpload';
import GalleryViewer from './components/GalleryViewer';
import ExifMetadata from './components/ExifMetadata';
import CostTracker from './components/CostTracker';
import ObjectsTable from './components/ObjectsTable';
import { Camera, Download, FileJson, FileText, FileSpreadsheet, Loader, ChevronRight, ChevronLeft, Info, DollarSign } from 'lucide-react';
import { uploadSingleImage, uploadBatchImages, getImageExif, exportResults } from './api/api';

function App() {
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'batch'
  const [currentExif, setCurrentExif] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load EXIF data when selected image changes
  useEffect(() => {
    if (images.length > 0 && images[selectedImageIndex]?.id) {
      loadExifData(images[selectedImageIndex].id);
    }
  }, [selectedImageIndex, images]);

  const loadExifData = async (imageId) => {
    try {
      const response = await getImageExif(imageId);
      setCurrentExif(response.data);
    } catch (err) {
      console.error('Error loading EXIF:', err);
      setCurrentExif(null);
    }
  };

  const handleImageUpload = async (files) => {
    setLoading(true);
    setError(null);
    setProcessingStatus('Uploading images...');

    try {
      let response;

      if (files.length === 1) {
        // Single image upload
        response = await uploadSingleImage(files[0]);
        const result = response.data;

        if (result.success && result.results) {
          const processedImages = result.results.map((img) => ({
            id: result.image_id,
            filename: img.filename,
            url: `http://localhost:8000${img.image_url}`,
            preview: URL.createObjectURL(files[0]),
            size: files[0].size,
            uploadTime: img.upload_timestamp,
            exif: img.exif,
            objects: img.objects,
            analysis: img.analysis,
            token_usage: img.token_usage,
            cost_estimate: img.cost_estimate,
            processing_time: img.processing_time,
          }));

          setImages((prev) => [...prev, ...processedImages]);
          setSelectedImageIndex(images.length);
        }
      } else {
        // Batch upload
        response = await uploadBatchImages(files);
        const result = response.data;

        if (result.success && result.results) {
          const processedImages = result.results.map((img, index) => ({
            id: `${result.batch_id}_${index}`,
            filename: img.filename,
            url: `http://localhost:8000${img.image_url}`,
            preview: URL.createObjectURL(files[index]),
            size: files[index]?.size,
            uploadTime: img.upload_timestamp,
            exif: img.exif,
            objects: img.objects,
            analysis: img.analysis,
            token_usage: img.token_usage,
            cost_estimate: img.cost_estimate,
            processing_time: img.processing_time,
          }));

          setImages((prev) => [...prev, ...processedImages]);
          setSelectedImageIndex(images.length);
        }
      }

      setProcessingStatus('Upload complete!');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload images');
    } finally {
      setLoading(false);
      setTimeout(() => setProcessingStatus(''), 3000);
    }
  };

  const handleExport = async (format) => {
    if (images.length === 0 || selectedImageIndex === null) {
      setError('No image selected for export');
      return;
    }

    const currentImage = images[selectedImageIndex];
    if (!currentImage.objects || currentImage.objects.length === 0) {
      setError('No detected objects to export');
      return;
    }

    try {
      setProcessingStatus(`Exporting as ${format.toUpperCase()}...`);

      // Prepare data for export
      const exportData = {
        filename: currentImage.filename,
        objects: currentImage.objects,
        analysis: currentImage.analysis,
        exif: currentImage.exif,
        token_usage: currentImage.token_usage,
        cost_estimate: currentImage.cost_estimate,
        processing_time: currentImage.processing_time
      };

      await exportResults(currentImage.id, format, exportData);

      setProcessingStatus(`Export successful!`);
      setTimeout(() => setProcessingStatus(''), 2000);
    } catch (err) {
      console.error('Export error:', err);
      setError(`Failed to export: ${err.message}`);
    }
  };

  const handleClearAll = () => {
    setImages([]);
    setSelectedImageIndex(0);
    setCurrentExif(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Camera className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Object Detection & EXIF Analysis
                </h1>
                <p className="text-sm text-gray-500">
                  Powered by GPT-4o Vision
                </p>
              </div>
            </div>

            {images.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Mode Toggle */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setUploadMode('single')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                uploadMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Single Image
            </button>
            <button
              onClick={() => setUploadMode('batch')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                uploadMode === 'batch'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Batch Upload
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Processing Status */}
        {processingStatus && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <Loader className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-blue-800">{processingStatus}</p>
          </div>
        )}

        {/* Upload Area */}
        {images.length === 0 ? (
          <div className="mb-8">
            <ImageUpload
              onUpload={handleImageUpload}
              multiple={uploadMode === 'batch'}
            />
          </div>
        ) : (
          <>
            {/* Main Content with Sidebar */}
            <div className="relative">
              {/* Toggle Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-l-lg p-3 hover:bg-gray-50 transition-all duration-300"
                style={{ right: sidebarOpen ? '320px' : '0' }}
              >
                <div className="flex items-center gap-2">
                  {sidebarOpen ? (
                    <>
                      <ChevronRight className="w-5 h-5" />
                      <span className="text-sm font-medium">Hide Info</span>
                    </>
                  ) : (
                    <>
                      <ChevronLeft className="w-5 h-5" />
                      <span className="text-sm font-medium">Show Info</span>
                    </>
                  )}
                </div>
              </button>

              {/* Sidebar */}
              <div className={`fixed right-0 top-0 h-full bg-white shadow-xl transition-transform duration-300 z-10 overflow-y-auto ${
                sidebarOpen ? 'translate-x-0' : 'translate-x-full'
              }`} style={{ width: '320px', marginTop: '80px', height: 'calc(100vh - 80px)' }}>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Image Information
                    </h3>
                  </div>

                  <ExifMetadata
                    metadata={currentExif}
                    loading={loading}
                  />

                  <CostTracker
                    images={images}
                    totalCost={null}
                  />
                </div>
              </div>

              {/* Main Content Area */}
              <div className={`transition-all duration-300 ${sidebarOpen ? 'mr-80' : 'mr-0'}`}>
                {/* Gallery */}
                <div className="mb-6">
                  <GalleryViewer
                    images={images}
                    selectedIndex={selectedImageIndex}
                    onSelectImage={setSelectedImageIndex}
                    onClose={() => {}}
                  />
                </div>

                {/* Detailed Objects Table */}
                <ObjectsTable
                  objects={images[selectedImageIndex]?.objects}
                  imageAnalysis={images[selectedImageIndex]?.analysis}
                  loading={loading}
                />

                {/* Export Options */}
                <div className="bg-white rounded-lg shadow-md p-4 mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Options</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleExport('json')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileJson className="w-4 h-4" />
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('yolo')}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Export as YOLO
                </button>
                <button
                  onClick={() => handleExport('coco')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Export as COCO
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export as CSV
                </button>
              </div>
            </div>

                {/* Add More Images Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      document.querySelector('input[type="file"]')?.click();
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Add More Images
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Hidden upload input for adding more images */}
        {images.length > 0 && (
          <div className="hidden">
            <ImageUpload
              onUpload={handleImageUpload}
              multiple={uploadMode === 'batch'}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;