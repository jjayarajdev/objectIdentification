import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Upload, FolderOpen, Download, Settings,
  Clock, MapPin, Cloud, Wifi, WifiOff, Grid,
  List, Plus, Home, FileText, Database,
  ChevronRight, Check, X, AlertTriangle,
  Smartphone, Monitor, Tablet, RefreshCw, HardDrive,
  Edit2, Trash2, Map
} from 'lucide-react';
import SceneAnalysisWithMap from './SceneAnalysisWithMap';
import ImageAnnotator from './ImageAnnotator';
import PhotoLocationViewer from './PhotoLocationViewer';
import offlineStorage from '../utils/offlineStorage';
import syncService from '../utils/syncService';
import exportService from '../utils/exportService';

const SurveyorDashboard = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [selectedAnalysisIndex, setSelectedAnalysisIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [activeTab, setActiveTab] = useState('capture'); // capture, analysis, reports
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentProject, setCurrentProject] = useState('New Survey');
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [syncStatus, setSyncStatus] = useState({ pending: 0, syncing: false });
  const [offlineMode, setOfflineMode] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [imageToAnnotate, setImageToAnnotate] = useState(null);
  const [showLocationViewer, setShowLocationViewer] = useState(false);
  const [imageToLocate, setImageToLocate] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Quick templates for surveyors
  const templates = [
    { id: 1, name: 'Building Exterior', icon: Home, color: 'blue' },
    { id: 2, name: 'Interior Survey', icon: Grid, color: 'green' },
    { id: 3, name: 'Construction Site', icon: Settings, color: 'orange' },
    { id: 4, name: 'Infrastructure', icon: MapPin, color: 'purple' },
  ];

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleAnnotateImage = (file) => {
    const imageUrl = URL.createObjectURL(file);
    setImageToAnnotate({ url: imageUrl, file });
    setShowAnnotator(true);
  };

  const handleViewLocation = (file) => {
    const imageUrl = URL.createObjectURL(file);
    setImageToLocate({ url: imageUrl, file });
    setShowLocationViewer(true);
  };

  const handleSaveAnnotatedImage = (annotatedData) => {
    // Save the annotated image data
    const updatedFile = new File([annotatedData.blob], annotatedData.file.name, {
      type: 'image/png'
    });

    // Replace the original file with annotated one
    const fileIndex = selectedFiles.findIndex(f => f === imageToAnnotate.file);
    if (fileIndex !== -1) {
      const newFiles = [...selectedFiles];
      newFiles[fileIndex] = updatedFile;
      setSelectedFiles(newFiles);
    }

    // Store annotation data for later use
    localStorage.setItem(
      `annotations_${annotatedData.file.name}`,
      JSON.stringify(annotatedData.annotations)
    );

    setShowAnnotator(false);
    setImageToAnnotate(null);
  };

  const processFiles = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;

    setLoading(true);
    setBatchProgress({ current: 0, total: selectedFiles.length });

    const results = [];
    const projectId = `proj_${Date.now()}`;

    // Save project if offline
    if (offlineMode || !isOnline) {
      await offlineStorage.saveProject({
        id: projectId,
        name: currentProject,
        description: 'Field survey',
        location: await getCurrentLocation(),
        client: 'CBRE'
      });
    }

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setBatchProgress({ current: i + 1, total: selectedFiles.length });

      try {
        if (isOnline && !offlineMode) {
          // Online processing
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('http://localhost:8000/api/room-analysis/analyze-room', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            console.log('Analysis result from backend:', result); // Debug log
            results.push({
              ...result,
              fileName: file.name,
              timestamp: new Date().toISOString(),
              location: await getCurrentLocation(),
              imageFile: file,  // Add the original file for EXIF extraction
              // Ensure consistent field naming for exports
              sceneType: result.scene_type,
              sceneOverview: result.scene_overview,
              simplifiedData: result.simplified_data,
              narrativeReport: result.narrative_report,
              keyObservations: result.key_observations
            });
          }
        } else {
          // Offline processing - save locally
          const imageData = {
            filename: file.name,
            blob: file,
            size: file.size,
            type: file.type,
            projectId: projectId,
            metadata: {
              location: await getCurrentLocation(),
              timestamp: new Date().toISOString()
            }
          };

          const savedImage = await offlineStorage.saveImage(imageData);

          // Create placeholder analysis for offline viewing
          const offlineAnalysis = {
            imageId: savedImage.id,
            sceneType: 'pending',
            sceneOverview: 'Analysis pending - will process when online',
            simplifiedData: [
              {
                identifier: 'Status',
                details: 'Saved for offline processing',
                estimated_cost: '—'
              }
            ],
            offline: true
          };

          await offlineStorage.saveAnalysis(offlineAnalysis);

          results.push({
            ...offlineAnalysis,
            fileName: file.name,
            timestamp: new Date().toISOString(),
            location: await getCurrentLocation(),
            imageFile: file,  // Add the original file for EXIF extraction
            imageUrl: URL.createObjectURL(file)
          });
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);

        // Try to save offline if online processing failed
        if (isOnline) {
          const imageData = {
            filename: file.name,
            blob: file,
            size: file.size,
            type: file.type,
            projectId: projectId,
            metadata: {
              location: await getCurrentLocation(),
              timestamp: new Date().toISOString(),
              error: error.message
            }
          };

          await offlineStorage.saveImage(imageData);
        }
      }
    }

    setAnalysisResults(prev => [...prev, ...results]);
    setUploadedImages(prev => [...prev, ...selectedFiles]);
    setSelectedFiles([]);
    setLoading(false);
    setBatchProgress({ current: 0, total: 0 });
    setActiveTab('analysis');

    // Update storage stats
    updateStorageStats();
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => resolve({ lat: null, lng: null })
      );
    });
  };

  const exportToExcel = () => {
    if (analysisResults.length === 0) {
      alert('No analysis results to export');
      return;
    }

    try {
      exportService.exportToExcel(analysisResults, currentProject);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to Excel');
    }
  };

  const exportToPDF = () => {
    if (analysisResults.length === 0) {
      alert('No analysis results to export');
      return;
    }

    try {
      exportService.exportToPDF(analysisResults, {
        name: currentProject,
        location: 'Field Survey',
        client: 'CBRE'
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to PDF');
    }
  };

  const exportToCSV = () => {
    if (analysisResults.length === 0) {
      alert('No analysis results to export');
      return;
    }

    try {
      exportService.exportToCSV(analysisResults, `${currentProject.replace(/[^a-z0-9]/gi, '_')}.csv`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export to CSV');
    }
  };

  // Initialize offline capabilities and sync
  useEffect(() => {
    const initializeOffline = async () => {
      // Load cached data on startup
      const projects = await offlineStorage.getAllProjects();
      if (projects.length > 0) {
        setCurrentProject(projects[0].name);
      }

      // Update storage stats
      updateStorageStats();

      // Setup sync listener
      syncService.addListener(handleSyncEvent);

      // Check sync status
      const status = await syncService.getSyncStatus();
      setSyncStatus({
        pending: status.pendingSync.total,
        syncing: status.syncing
      });
    };

    initializeOffline();

    return () => {
      syncService.removeListener(handleSyncEvent);
    };
  }, []);

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!offlineMode) {
        // Auto-sync when coming online
        handleManualSync();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineMode]);

  const handleSyncEvent = async (event, data) => {
    switch (event) {
      case 'sync-start':
        setSyncStatus(prev => ({ ...prev, syncing: true }));
        break;
      case 'sync-complete':
        setSyncStatus({ pending: 0, syncing: false });
        updateStorageStats();
        break;
      case 'sync-error':
        setSyncStatus(prev => ({ ...prev, syncing: false }));
        break;
    }
  };

  const updateStorageStats = async () => {
    try {
      const stats = await offlineStorage.getStorageStats();
      setStorageStats(stats);

      const syncStatus = await syncService.getSyncStatus();
      setSyncStatus({
        pending: syncStatus.pendingSync.total,
        syncing: syncStatus.syncing
      });
    } catch (error) {
      console.error('Error updating storage stats:', error);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline');
      return;
    }

    setSyncStatus(prev => ({ ...prev, syncing: true }));
    const result = await syncService.manualSync();

    if (result.success) {
      setSyncStatus({ pending: 0, syncing: false });
      updateStorageStats();
    } else {
      setSyncStatus(prev => ({ ...prev, syncing: false }));
      alert(`Sync failed: ${result.error || 'Unknown error'}`);
    }
  };

  const handleClearOfflineData = async () => {
    if (confirm('This will delete all offline data. Are you sure?')) {
      await syncService.clearOfflineData();
      setAnalysisResults([]);
      setUploadedImages([]);
      updateStorageStats();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Property Surveyor Pro</h1>
                <p className="text-sm text-gray-500">{currentProject}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sync Status */}
              {syncStatus.pending > 0 && (
                <button
                  onClick={handleManualSync}
                  disabled={syncStatus.syncing || !isOnline}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 hover:bg-yellow-200 transition-colors"
                >
                  {syncStatus.syncing ? (
                    <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="text-xs text-gray-600">
                    {syncStatus.syncing ? 'Syncing...' : `${syncStatus.pending} pending`}
                  </span>
                </button>
              )}

              {/* Offline Mode Toggle */}
              <button
                onClick={() => setOfflineMode(!offlineMode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                  offlineMode ? 'bg-orange-100' : 'bg-gray-100'
                }`}
              >
                <HardDrive className={`w-4 h-4 ${offlineMode ? 'text-orange-500' : 'text-gray-500'}`} />
                <span className="text-xs text-gray-600">
                  {offlineMode ? 'Offline Mode' : 'Auto'}
                </span>
              </button>

              {/* Connection Status */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-600">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-gray-600">Offline</span>
                  </>
                )}
              </div>

              <button className="md:hidden p-2">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t">
          <button
            onClick={() => setActiveTab('capture')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'capture'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Camera className="w-4 h-4 mx-auto mb-1" />
            Capture
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'analysis'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid className="w-4 h-4 mx-auto mb-1" />
            Analysis
            {analysisResults.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'reports'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 mx-auto mb-1" />
            Reports
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'capture' && (
          <div className="p-4 space-y-4">
            {/* Quick Templates */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Templates</h3>
              <div className="grid grid-cols-2 gap-2">
                {templates.map(template => (
                  <button
                    key={template.id}
                    className={`p-3 rounded-lg border-2 hover:shadow-md transition-all flex items-center gap-2`}
                    style={{ borderColor: `var(--${template.color}-200)` }}
                  >
                    <template.icon className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6"
            >
              <div className="text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Drop photos here or browse
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Support for JPG, PNG, HEIC • Max 10MB each
                </p>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse Files
                  </button>

                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Selected Photos ({selectedFiles.length})
                  </h3>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {selectedFiles.slice(0, 6).map((file, idx) => (
                    <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Action buttons */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleAnnotateImage(file)}
                          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                          title="Annotate"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewLocation(file)}
                          className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                          title="View Location"
                        >
                          <Map className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {selectedFiles.length > 6 && (
                    <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        +{selectedFiles.length - 6}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleBatchUpload}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing {batchProgress.current}/{batchProgress.total}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Analyze {selectedFiles.length} Photo{selectedFiles.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="p-4">
            {analysisResults.length > 0 ? (
              <div className="space-y-4">
                {/* Tabs for multiple results */}
                <div className="bg-white rounded-lg shadow-sm">
                  {/* Tab Headers */}
                  <div className="flex border-b overflow-x-auto">
                    {analysisResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedAnalysisIndex(idx)}
                        className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                          selectedAnalysisIndex === idx
                            ? 'text-blue-600 border-blue-600 bg-blue-50'
                            : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate max-w-[150px]">
                          {result.fileName || `Image ${idx + 1}`}
                        </span>
                        {selectedAnalysisIndex === idx && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                    {analysisResults.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm('Clear all analysis results?')) {
                            setAnalysisResults([]);
                            setSelectedAnalysisIndex(0);
                          }
                        }}
                        className="ml-auto px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {analysisResults[selectedAnalysisIndex] && (
                      <>
                        {/* Analysis Info Bar */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">
                              {analysisResults[selectedAnalysisIndex].fileName}
                            </span>
                            {analysisResults[selectedAnalysisIndex].timestamp && (
                              <span className="ml-2 text-gray-500">
                                • {new Date(analysisResults[selectedAnalysisIndex].timestamp).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const currentResult = analysisResults[selectedAnalysisIndex];
                                exportService.exportToPDF([currentResult], {
                                  name: currentResult.fileName || 'Analysis',
                                  client: 'CBRE'
                                });
                              }}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              PDF
                            </button>
                            <button
                              onClick={() => {
                                const currentResult = analysisResults[selectedAnalysisIndex];
                                exportService.exportToExcel([currentResult], currentResult.fileName);
                              }}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Excel
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Remove this analysis?')) {
                                  const newResults = [...analysisResults];
                                  newResults.splice(selectedAnalysisIndex, 1);
                                  setAnalysisResults(newResults);
                                  setSelectedAnalysisIndex(Math.max(0, selectedAnalysisIndex - 1));
                                }
                              }}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Scene Analysis Component with Map */}
                        <SceneAnalysisWithMap
                          analysis={analysisResults[selectedAnalysisIndex]}
                          fileName={analysisResults[selectedAnalysisIndex].fileName}
                          imageFile={analysisResults[selectedAnalysisIndex].imageFile}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-8 text-center">
                <Grid className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-1">No analysis results yet</p>
                <p className="text-sm text-gray-500">Upload photos to get started</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Export Options</h3>
              <div className="space-y-3">
                <button
                  onClick={exportToPDF}
                  className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-600" />
                    <div className="text-left">
                      <p className="font-medium">PDF Report</p>
                      <p className="text-xs text-gray-500">Professional formatted document</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={exportToExcel}
                  className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Grid className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">Excel Spreadsheet</p>
                      <p className="text-xs text-gray-500">Data analysis and calculations</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={exportToCSV}
                  className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium">CSV Export</p>
                      <p className="text-xs text-gray-500">Simple data table format</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={handleManualSync}
                  disabled={!isOnline || syncStatus.syncing}
                  className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium">Cloud Sync</p>
                      <p className="text-xs text-gray-500">
                        {syncStatus.syncing ? 'Syncing...' :
                         syncStatus.pending > 0 ? `${syncStatus.pending} items pending` :
                         'All synced'}
                      </p>
                    </div>
                  </div>
                  {syncStatus.syncing ? (
                    <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Reports</h3>
              <div className="space-y-2">
                <div className="p-3 border rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Site Survey - Building A</p>
                      <p className="text-xs text-gray-500">Today, 2:30 PM</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Offline Storage Stats */}
            {storageStats && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-gray-700">Offline Storage</h3>
                  <button
                    onClick={handleClearOfflineData}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Images:</span>
                    <span className="font-medium">{storageStats.images.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Analysis:</span>
                    <span className="font-medium">{storageStats.analysis.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Projects:</span>
                    <span className="font-medium">{storageStats.projects.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Storage Used:</span>
                    <span className="font-medium">
                      {(storageStats.images.totalSize / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Image Annotator Modal */}
      {showAnnotator && imageToAnnotate && (
        <ImageAnnotator
          imageUrl={imageToAnnotate.url}
          onSave={handleSaveAnnotatedImage}
          onClose={() => {
            setShowAnnotator(false);
            setImageToAnnotate(null);
          }}
        />
      )}

      {/* Photo Location Viewer Modal */}
      {showLocationViewer && imageToLocate && (
        <PhotoLocationViewer
          file={imageToLocate.file}
          imageUrl={imageToLocate.url}
          onClose={() => {
            setShowLocationViewer(false);
            setImageToLocate(null);
          }}
        />
      )}
    </div>
  );
};

export default SurveyorDashboard;