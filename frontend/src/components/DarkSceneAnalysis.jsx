import React, { useState, useEffect, useRef } from 'react';
import { MapPin, FileText, ChevronDown, ChevronUp, Download, Eye, X, Edit2, Save, Plus, Trash2 } from 'lucide-react';
import exifr from 'exifr';
import exportService from '../utils/exportService';

const DarkSceneAnalysis = ({ analysis, fileName, imageFile }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNarrative, setShowNarrative] = useState(false);
  const [gpsData, setGpsData] = useState(null);
  const [address, setAddress] = useState('');
  const [exifData, setExifData] = useState(null);
  const [showExif, setShowExif] = useState(false);
  const mapRef = useRef(null);

  // Editable table state
  const [tableData, setTableData] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [nextId, setNextId] = useState(1);

  const sceneOverview = analysis.scene_overview || analysis.sceneOverview;
  const originalItemsData = analysis.simplified_data || analysis.simplifiedData || [];
  const keyObservations = analysis.key_observations || analysis.keyObservations || [];
  const narrativeReport = analysis.narrative_report || analysis.narrativeReport;
  const sceneType = analysis.scene_type || analysis.sceneType || 'Unknown';

  useEffect(() => {
    if (imageFile) {
      setExifData(null);
      setGpsData(null);
      setAddress('');
      setShowExif(false);
      extractLocationData();
    }
  }, [imageFile]);

  useEffect(() => {
    if (gpsData && mapRef.current) {
      initializeMap();
    }
  }, [gpsData]);

  useEffect(() => {
    if (originalItemsData.length > 0) {
      const formattedData = originalItemsData.map((item, index) => ({
        id: index + 1,
        number: index + 1,
        category: item.category || 'Unknown',
        object: item.object || item.identifier || '',
        details: item.details || '',
        position: item.position || '—',
        estimated_cost: item.estimated_cost || '—'
      }));
      setTableData(formattedData);
      setNextId(formattedData.length + 1);
    } else {
      setTableData([]);
      setNextId(1);
    }
  }, [JSON.stringify(originalItemsData)]);

  const extractLocationData = async () => {
    try {
      let data = await exifr.parse(imageFile, true);
      if (data) {
        setExifData(data);
        let lat = data.latitude || data.GPSLatitude || data.lat;
        let lng = data.longitude || data.GPSLongitude || data.lng || data.lon;

        if (lat && lng) {
          setGpsData({
            lat: typeof lat === 'number' ? lat : parseFloat(lat),
            lng: typeof lng === 'number' ? lng : parseFloat(lng)
          });
        } else {
          const gpsData = await exifr.gps(imageFile);
          if (gpsData && gpsData.latitude && gpsData.longitude) {
            setGpsData({
              lat: gpsData.latitude,
              lng: gpsData.longitude
            });
          }
        }
      }
    } catch (err) {
      console.log('Error extracting EXIF data:', err);
    }
  };

  const initializeMap = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/config/maps-key');
      const config = await response.json();

      if (!config.apiKey) return;

      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const map = new window.google.maps.Map(mapRef.current, {
        center: gpsData,
        zoom: 16,
        mapTypeId: 'roadmap',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#2a2a2a' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }]
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#3a3a3a' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1f2835' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f3d19c' }]
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2f3948' }]
          },
          {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#515c6d' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#17263c' }]
          }
        ]
      });

      new window.google.maps.Marker({
        position: gpsData,
        map: map,
        title: fileName
      });

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: gpsData }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setAddress(results[0].formatted_address);
        }
      });
    } catch (err) {
      console.error('Map initialization error:', err);
    }
  };

  const handleEdit = (id) => {
    const item = tableData.find(item => item.id === id);
    if (item) {
      setEditingId(id);
      setEditValues({
        category: item.category,
        object: item.object,
        details: item.details,
        position: item.position,
        estimated_cost: item.estimated_cost
      });
    }
  };

  const handleSave = () => {
    setTableData(prev => prev.map(item =>
      item.id === editingId ? { ...item, ...editValues } : item
    ));
    setEditingId(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const handleAddRow = () => {
    const newRow = {
      id: nextId,
      number: nextId,
      category: 'General',
      object: '',
      details: '',
      position: '—',
      estimated_cost: '—'
    };
    setTableData(prev => [...prev, newRow]);
    setNextId(prev => prev + 1);
    setEditingId(nextId);
    setEditValues({
      category: 'General',
      object: '',
      details: '',
      position: '—',
      estimated_cost: '—'
    });
  };

  const handleRemoveRow = (id) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      setTableData(prev => prev.filter(item => item.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditValues({});
      }
    }
  };

  const handleDownloadReport = async () => {
    try {
      const data = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
      const exportData = [{
        fileName: data.filename || data.fileName || fileName || 'Analysis',
        filename: data.filename || data.fileName || fileName || 'Analysis',
        timestamp: data.timestamp || data.analysis_timestamp || new Date().toISOString(),
        scene_type: data.scene_type || data.sceneType,
        sceneType: data.scene_type || data.sceneType,
        scene_overview: data.scene_overview || data.sceneOverview,
        sceneOverview: data.scene_overview || data.sceneOverview,
        simplified_data: data.simplified_data || data.simplifiedData,
        simplifiedData: data.simplified_data || data.simplifiedData,
        narrative_report: data.narrative_report || data.narrativeReport,
        narrativeReport: data.narrative_report || data.narrativeReport,
        key_observations: data.key_observations || data.keyObservations,
        keyObservations: data.key_observations || data.keyObservations,
        location: data.location,
        imageFile: imageFile
      }];

      await exportService.exportToWord(exportData, {
        name: data.filename || data.fileName || fileName || 'Analysis',
        client: 'CBRE'
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export: ${error.message}`);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
      {/* Collapsible Header */}
      <div className="bg-teal-500/5 border-b border-teal-500/20 p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-teal-500/10 text-teal-400 text-sm rounded-lg font-medium">
              {sceneType.replace(/_/g, ' ').toUpperCase()}
            </span>
            <h3 className="text-white font-semibold text-lg">{fileName}</h3>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Top Section: Image, Map, Overview */}
          <div className="grid grid-cols-3 gap-4">
            {/* Property Image */}
            {imageFile && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                    Property Image
                    {exifData && (
                      <button
                        onClick={() => setShowExif(!showExif)}
                        className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        EXIF
                      </button>
                    )}
                  </h4>
                </div>
                <div className="rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt={fileName || 'Property image'}
                    className="w-full h-auto max-h-[300px] object-cover"
                  />
                </div>
              </div>
            )}

            {/* Location Map */}
            <div>
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-teal-500" />
                Property Location
              </h4>
              {gpsData ? (
                <div>
                  <div ref={mapRef} className="w-full h-[300px] rounded-lg border border-gray-700" />
                  {address && (
                    <p className="mt-2 text-xs text-gray-400 line-clamp-2">
                      <strong>Address:</strong> {address}
                    </p>
                  )}
                </div>
              ) : (
                <div className="w-full h-[300px] rounded-lg border border-gray-700 bg-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No location data</p>
                  </div>
                </div>
              )}
            </div>

            {/* Scene Overview */}
            <div>
              <h4 className="font-semibold text-white mb-2 text-sm">Scene Overview</h4>
              <div className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-4 h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <p className="text-xs text-gray-300 leading-relaxed">{sceneOverview}</p>
              </div>
            </div>
          </div>

          {/* Detected Items Table */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-white">Detected Items & Features</h4>
              <button
                onClick={handleAddRow}
                className="px-3 py-1 text-sm bg-teal-500/10 text-teal-400 rounded-lg hover:bg-teal-500/20 flex items-center gap-1 border border-teal-500/20"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Object/Element</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Est. Cost (INR)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[#0a0a0a] divide-y divide-gray-800">
                  {tableData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-300 font-medium">
                        {item.number}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === item.id ? (
                          <select
                            value={editValues.category || ''}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                          >
                            <option value="General">General</option>
                            <option value="Building Element">Building Element</option>
                            <option value="Infrastructure">Infrastructure</option>
                            <option value="Industrial Equipment">Industrial Equipment</option>
                            <option value="Land Features">Land Features</option>
                            <option value="Power Infrastructure">Power Infrastructure</option>
                          </select>
                        ) : (
                          <span className="text-white font-medium">{item.category}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.object || ''}
                            onChange={(e) => handleInputChange('object', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                            placeholder="Enter object/element"
                          />
                        ) : (
                          <span className="text-gray-300">{item.object}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === item.id ? (
                          <textarea
                            value={editValues.details || ''}
                            onChange={(e) => handleInputChange('details', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white resize-none"
                            rows="2"
                            placeholder="Enter description"
                          />
                        ) : (
                          <span className="text-gray-400">{item.details}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.position || ''}
                            onChange={(e) => handleInputChange('position', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                            placeholder="Enter position"
                          />
                        ) : (
                          <span className="text-gray-400">{item.position}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.estimated_cost || ''}
                            onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white"
                            placeholder="₹X,XXX or —"
                          />
                        ) : (
                          <span className="text-gray-300">{item.estimated_cost}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={handleSave}
                              className="p-1 bg-teal-500/10 text-teal-400 rounded hover:bg-teal-500/20"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(item.id)}
                              className="p-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveRow(item.id)}
                              className="p-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Observations */}
          {keyObservations.length > 0 && (
            <div>
              <h4 className="font-semibold text-white mb-3">Key Observations</h4>
              <div className="space-y-2">
                {keyObservations.map((obs, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-teal-500 mt-0.5">•</span>
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Detailed Report Button */}
          {narrativeReport && (
            <div className="pt-4">
              <button
                onClick={() => setShowNarrative(true)}
                className="w-full py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Detailed Report
              </button>
            </div>
          )}
        </div>
      )}

      {/* Narrative Report Modal */}
      {showNarrative && narrativeReport && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Detailed Survey Report</h3>
              <button
                onClick={() => setShowNarrative(false)}
                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: narrativeReport.replace(/\n/g, '<br />') }} />
              </div>
            </div>
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={handleDownloadReport}
                className="w-full py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download as Word Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DarkSceneAnalysis;
