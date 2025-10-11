import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Loader, CheckCircle, XCircle, Image as ImageIcon, Trash2, Eye, ChevronDown, Edit2, MapPin } from 'lucide-react';
import DarkSceneAnalysis from './DarkSceneAnalysis';
import exportService from '../utils/exportService';

const ModernDarkDashboard = () => {
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
        const timeoutId = setTimeout(() => controller.abort(), 300000);

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
    if (results.length > 0) {
      setSelectedImageIndex(0);
    }
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">CBRE Property Analysis</h1>
                <p className="text-sm text-gray-400">AI-Powered Scene Recognition & Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {analysisResults.length > 0 && (
                <button
                  onClick={exportAllToWord}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export All to Word
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Upload Section */}
        {analysisResults.length === 0 && (
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-12">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-700 rounded-2xl p-16 text-center hover:border-teal-500 transition-colors cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-teal-500/20 transition-colors">
                <Upload className="w-10 h-10 text-teal-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Drop images here or click to browse
              </h3>
              <p className="text-gray-400 mb-6">
                Support for JPEG, PNG • Up to 50 images at once
              </p>
              <button className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium">
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

            {/* Features */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-6 h-6 text-teal-500" />
                </div>
                <h4 className="text-white font-medium mb-1">Scene Recognition</h4>
                <p className="text-sm text-gray-400">Automatically identify property types and features</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-teal-500" />
                </div>
                <h4 className="text-white font-medium mb-1">Detailed Analysis</h4>
                <p className="text-sm text-gray-400">Get comprehensive reports on infrastructure and features</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Download className="w-6 h-6 text-teal-500" />
                </div>
                <h4 className="text-white font-medium mb-1">Export Reports</h4>
                <p className="text-sm text-gray-400">Download professional reports in Word format</p>
              </div>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-white">
                    Selected Images ({files.length})
                  </h4>
                  <button
                    onClick={() => setFiles([])}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-3 mb-6">
                  {files.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <p className="mt-1 text-xs text-gray-400 truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={processImages}
                  disabled={isProcessing}
                  className="w-full py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
            {/* Image Carousel */}
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">
                  Analyzed Images ({analysisResults.length})
                </h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {analysisResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-64 text-left rounded-xl transition-all overflow-hidden ${
                      selectedImageIndex === index
                        ? 'ring-2 ring-teal-500 shadow-lg shadow-teal-500/20'
                        : 'ring-1 ring-gray-700 hover:ring-gray-600'
                    }`}
                  >
                    {result.imageFile && (
                      <div className="aspect-video bg-gray-800">
                        <img
                          src={URL.createObjectURL(result.imageFile)}
                          alt={result.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-3 bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-1">
                        {result.status === 'success' ? (
                          <CheckCircle className="w-3 h-3 text-teal-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-xs font-medium text-white truncate">
                          {result.fileName}
                        </span>
                      </div>
                      {result.status === 'success' && (
                        <p className="text-xs text-teal-500 truncate">
                          {(result.scene_type || result.sceneType || '').replace(/_/g, ' ')}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Analysis Display */}
            {selectedImageIndex !== null && analysisResults[selectedImageIndex] && (
              <DarkSceneAnalysis
                analysis={analysisResults[selectedImageIndex]}
                fileName={analysisResults[selectedImageIndex].fileName}
                imageFile={analysisResults[selectedImageIndex].imageFile}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernDarkDashboard;
