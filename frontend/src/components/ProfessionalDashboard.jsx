import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Loader, CheckCircle, XCircle, Image as ImageIcon, Trash2, Eye } from 'lucide-react';
import SceneAnalysisWithMap from './SceneAnalysisWithMap';
import exportService from '../utils/exportService';

const ProfessionalDashboard = () => {
  const [files, setFiles] = useState([]);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(file =>
      file.type.startsWith('image/')
    );
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processImages = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress({ current: i + 1, total: files.length });

      try {
        const formData = new FormData();
        formData.append('file', file);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

        const response = await fetch('http://localhost:8000/api/room-analysis/analyze-room', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (response.ok) {
          const result = await response.json();
          results.push({
            ...result,
            fileName: file.name,
            timestamp: new Date().toISOString(),
            imageFile: file,
            status: 'success'
          });
        } else {
          results.push({
            fileName: file.name,
            status: 'error',
            error: `Failed: ${response.statusText}`
          });
        }
      } catch (error) {
        results.push({
          fileName: file.name,
          status: 'error',
          error: error.message
        });
      }
    }

    setAnalysisResults(results);
    setIsProcessing(false);
    setProcessingProgress({ current: 0, total: 0 });
  };

  const exportAllToWord = async () => {
    if (analysisResults.length === 0) return;

    try {
      const successfulResults = analysisResults.filter(r => r.status === 'success');
      await exportService.exportToWord(successfulResults, {
        name: 'Property_Analysis_Report',
        client: 'CBRE',
        location: 'Property Survey'
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  const clearAll = () => {
    if (confirm('Clear all images and results?')) {
      setFiles([]);
      setAnalysisResults([]);
      setSelectedImageIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CBRE Property Analysis</h1>
                <p className="text-sm text-gray-500">AI-Powered Scene Recognition & Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {analysisResults.length > 0 && (
                <>
                  <button
                    onClick={exportAllToWord}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export All to Word
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        {analysisResults.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Drop images here or click to browse
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Support for JPEG, PNG • Up to 50 images at once
              </p>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
                Select Images
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">
                    Selected Images ({files.length})
                  </h4>
                  <button
                    onClick={() => setFiles([])}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <p className="mt-1 text-xs text-gray-600 truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={processImages}
                  disabled={isProcessing}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      Processing {processingProgress.current} of {processingProgress.total}...
                    </span>
                  ) : (
                    `Analyze ${files.length} Image${files.length > 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {analysisResults.length > 0 && (
          <div className="space-y-4">
            {/* Top Bar - Image Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Analyzed Images ({analysisResults.length})
                </h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {analysisResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-48 text-left p-2 rounded-lg transition-all ${
                      selectedImageIndex === index
                        ? 'bg-blue-50 border-2 border-blue-500 shadow-md'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:shadow'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
                      )}
                      <span className="text-xs font-medium text-gray-900 truncate">
                        {result.fileName}
                      </span>
                    </div>
                    {result.imageFile && (
                      <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-1">
                        <img
                          src={URL.createObjectURL(result.imageFile)}
                          alt={result.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {result.status === 'success' && (
                      <p className="text-xs text-gray-500 truncate">
                        {(result.scene_type || result.sceneType || '').replace(/_/g, ' ')}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content - Analysis Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {selectedImageIndex !== null && analysisResults[selectedImageIndex] ? (
                analysisResults[selectedImageIndex].status === 'success' ? (
                  <div className="p-6">
                    <SceneAnalysisWithMap
                      analysis={analysisResults[selectedImageIndex]}
                      fileName={analysisResults[selectedImageIndex].fileName}
                      imageFile={analysisResults[selectedImageIndex].imageFile}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Failed</h3>
                    <p className="text-gray-600">
                      {analysisResults[selectedImageIndex].error || 'Unknown error occurred'}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select an image to view analysis
                  </h3>
                  <p className="text-gray-600">
                    Choose an image from the horizontal selector above
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalDashboard;
