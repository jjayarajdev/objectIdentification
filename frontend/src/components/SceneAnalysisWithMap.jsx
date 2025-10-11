import React, { useState, useEffect, useRef } from 'react';
import { MapPin, FileText, ChevronDown, ChevronRight, Download, Eye, X, Edit2, Save, Plus, Trash2 } from 'lucide-react';
import exifr from 'exifr';

const SceneAnalysisWithMap = ({ analysis, fileName, imageFile }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNarrative, setShowNarrative] = useState(false);
  const [gpsData, setGpsData] = useState(null);
  const [address, setAddress] = useState('');
  const [mapError, setMapError] = useState(null);
  const [exifData, setExifData] = useState(null);
  const [showExif, setShowExif] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Editable table state
  const [tableData, setTableData] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [nextId, setNextId] = useState(1);

  useEffect(() => {
    if (imageFile) {
      // Reset EXIF data when image changes
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

  const extractLocationData = async () => {
    try {
      console.log('Extracting EXIF data from:', imageFile);

      // Try different parsing approaches
      let data = await exifr.parse(imageFile, true); // Parse all EXIF data
      console.log('Full EXIF data:', data);

      // Store all EXIF data
      if (data) {
        setExifData(data);
      }

      // Check for GPS data in different formats
      if (data) {
        let lat = data.latitude || data.GPSLatitude || data.lat;
        let lng = data.longitude || data.GPSLongitude || data.lng || data.lon;

        console.log('Found coordinates:', lat, lng);

        if (lat && lng) {
          console.log('GPS coordinates found:', lat, lng);
          setGpsData({
            lat: typeof lat === 'number' ? lat : parseFloat(lat),
            lng: typeof lng === 'number' ? lng : parseFloat(lng)
          });
        } else {
          console.log('No GPS coordinates found in EXIF data');
          // Try parsing just GPS data
          const gpsData = await exifr.gps(imageFile);
          console.log('GPS specific parse:', gpsData);
          if (gpsData && gpsData.latitude && gpsData.longitude) {
            setGpsData({
              lat: gpsData.latitude,
              lng: gpsData.longitude
            });
          }
        }
      } else {
        console.log('No EXIF data found');
      }
    } catch (err) {
      console.log('Error extracting EXIF data:', err);
    }
  };

  const initializeMap = async () => {
    try {
      // Get API key from backend
      const response = await fetch('http://localhost:8000/api/config/maps-key');
      const config = await response.json();

      if (!config.apiKey) {
        setMapError('Maps not configured');
        return;
      }

      // Load Google Maps script dynamically
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

      // Initialize map
      const map = new window.google.maps.Map(mapRef.current, {
        center: gpsData,
        zoom: 16,
        mapTypeId: 'roadmap',
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: true,
        zoomControl: true
      });

      mapInstanceRef.current = map;

      // Add marker
      new window.google.maps.Marker({
        position: gpsData,
        map: map,
        title: fileName
      });

      // Get address using geocoding
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: gpsData }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setAddress(results[0].formatted_address);
        }
      });
    } catch (err) {
      console.error('Map initialization error:', err);
      setMapError('Unable to load map');
    }
  };

  const sceneOverview = analysis.scene_overview || analysis.sceneOverview;
  // Use the items data directly - the backend should provide the correct format
  const originalItemsData = analysis.simplified_data || analysis.simplifiedData || [];
  const keyObservations = analysis.key_observations || analysis.keyObservations || [];
  const narrativeReport = analysis.narrative_report || analysis.narrativeReport;
  const propertyValue = analysis.estimated_property_value || analysis.estimatedPropertyValue;
  const sceneType = analysis.scene_type || analysis.sceneType || 'Unknown';

  // Initialize table data when analysis changes
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
  }, [JSON.stringify(originalItemsData)]); // Reset table whenever analysis data changes

  // Editable table functions
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
      item.id === editingId
        ? { ...item, ...editValues }
        : item
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
    // Start editing the new row immediately
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

  const getSceneTypeColor = (type) => {
    const colors = {
      'indoor_office': 'blue',
      'indoor_industrial': 'orange',
      'building_exterior': 'green',
      'land_property': 'brown',
      'construction_site': 'yellow',
      'infrastructure': 'purple',
      'parking_area': 'gray',
      'other': 'gray'
    };
    return colors[type] || 'gray';
  };

  const formatExifValue = (key, value) => {
    if (value === null || value === undefined) return 'N/A';

    // Format specific EXIF fields
    if (key === 'DateTimeOriginal' || key === 'DateTime' || key === 'CreateDate') {
      return new Date(value).toLocaleString();
    }
    if (key === 'ExposureTime') {
      return `1/${Math.round(1/value)}s`;
    }
    if (key === 'FNumber') {
      return `f/${value}`;
    }
    if (key === 'FocalLength') {
      return `${value}mm`;
    }
    if (key === 'ISO') {
      return `ISO ${value}`;
    }
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value.toString();
  };

  const getImportantExifFields = () => {
    if (!exifData) return [];

    const importantFields = [
      { key: 'Make', label: 'Camera Make' },
      { key: 'Model', label: 'Camera Model' },
      { key: 'DateTimeOriginal', label: 'Date Taken' },
      { key: 'ExposureTime', label: 'Shutter Speed' },
      { key: 'FNumber', label: 'Aperture' },
      { key: 'ISO', label: 'ISO' },
      { key: 'FocalLength', label: 'Focal Length' },
      { key: 'LensModel', label: 'Lens' },
      { key: 'ImageWidth', label: 'Width' },
      { key: 'ImageHeight', label: 'Height' },
      { key: 'Orientation', label: 'Orientation' },
      { key: 'Flash', label: 'Flash' },
      { key: 'WhiteBalance', label: 'White Balance' },
      { key: 'latitude', label: 'GPS Latitude' },
      { key: 'longitude', label: 'GPS Longitude' },
      { key: 'GPSAltitude', label: 'GPS Altitude' }
    ];

    return importantFields
      .filter(field => exifData[field.key] !== undefined && exifData[field.key] !== null)
      .map(field => ({
        label: field.label,
        value: formatExifValue(field.key, exifData[field.key])
      }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:bg-white/20 p-1 rounded transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <h3 className="text-white font-semibold text-lg">{fileName || 'Scene Analysis'}</h3>
            <span className={`px-3 py-1 bg-white/20 text-white text-sm rounded-full`}>
              {sceneType.replace(/_/g, ' ').charAt(0).toUpperCase() + sceneType.replace(/_/g, ' ').slice(1)}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          {/* Top Section: Image, Map, and Overview - Horizontal Layout */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Image Display */}
            {imageFile && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-800 text-sm">Property Image</h4>
                  {exifData && (
                    <button
                      onClick={() => setShowExif(!showExif)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      EXIF
                    </button>
                  )}
                </div>
                <div className="rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
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
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-blue-600" />
                Property Location
              </h4>
              {gpsData ? (
                <div>
                  <div ref={mapRef} className="w-full h-[300px] rounded-lg border border-gray-300" />
                  {address && (
                    <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                      <strong>Address:</strong> {address}
                    </p>
                  )}
                </div>
              ) : (
                <div className="w-full h-[300px] rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No location data</p>
                  </div>
                </div>
              )}
            </div>

            {/* Scene Overview */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-2 text-sm">Scene Overview</h4>
              <div className="bg-blue-50 rounded-lg p-3 h-[300px] overflow-y-auto">
                <p className="text-xs text-gray-700 leading-relaxed">{sceneOverview}</p>
              </div>
            </div>
          </div>

          {/* EXIF Data Display - Collapsible */}
          {showExif && exifData && imageFile && (
            <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-300">
              <h5 className="font-semibold text-gray-800 mb-3 text-sm">Image Metadata (EXIF)</h5>
              <div className="grid grid-cols-4 gap-2">
                {getImportantExifFields().map((field, index) => (
                  <div key={index} className="bg-white rounded p-2 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                    <div className="text-xs font-medium text-gray-900">{field.value}</div>
                  </div>
                ))}
              </div>
              {getImportantExifFields().length === 0 && (
                <p className="text-sm text-gray-500">No EXIF metadata available for this image</p>
              )}
            </div>
          )}

          {/* Detected Items Table */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-800">Detected Items & Features</h4>
              <button
                onClick={handleAddRow}
                className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold">#</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Category</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Object/Element</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Description</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Position</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Est. Cost (INR)</th>
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((item) => (
                    <tr key={item.id} className={item.number % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                        {item.number}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-medium">
                        {editingId === item.id ? (
                          <select
                            value={editValues.category || ''}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="General">General</option>
                            <option value="People">People</option>
                            <option value="Furniture">Furniture</option>
                            <option value="Lighting">Lighting</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Flooring">Flooring</option>
                            <option value="Ceiling">Ceiling</option>
                            <option value="Walls">Walls</option>
                            <option value="Doors">Doors</option>
                            <option value="Windows">Windows</option>
                            <option value="Plants">Plants</option>
                            <option value="Signage">Signage</option>
                            <option value="Safety">Safety</option>
                            <option value="HVAC">HVAC</option>
                            <option value="Storage">Storage</option>
                            <option value="Infrastructure">Infrastructure</option>
                            <option value="Vehicle">Vehicle</option>
                            <option value="Building Element">Building Element</option>
                          </select>
                        ) : (
                          item.category
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.object || ''}
                            onChange={(e) => handleInputChange('object', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                            placeholder="Enter object/element"
                          />
                        ) : (
                          item.object
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">
                        {editingId === item.id ? (
                          <textarea
                            value={editValues.details || ''}
                            onChange={(e) => handleInputChange('details', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm resize-none"
                            rows="2"
                            placeholder="Enter description"
                          />
                        ) : (
                          item.details
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.position || ''}
                            onChange={(e) => handleInputChange('position', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                            placeholder="Enter position"
                          />
                        ) : (
                          item.position
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.estimated_cost || ''}
                            onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                            placeholder="₹X,XXX or —"
                          />
                        ) : (
                          item.estimated_cost
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={handleSave}
                              className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              className="p-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(item.id)}
                              className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveRow(item.id)}
                              className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
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
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">Key Observations</h4>
              <ul className="space-y-2">
                {keyObservations.map((obs, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span className="text-gray-700">{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Property Value Estimate */}
          {propertyValue && (propertyValue.min || propertyValue.max) && (
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">Estimated Property Value</h4>
              <div className="text-2xl font-bold text-green-700">
                {propertyValue.min && propertyValue.max
                  ? `₹${(propertyValue.min / 1000000).toFixed(1)}M - ₹${(propertyValue.max / 1000000).toFixed(1)}M`
                  : propertyValue.max
                  ? `Up to ₹${(propertyValue.max / 1000000).toFixed(1)}M`
                  : 'Under evaluation'}
              </div>
              {propertyValue.basis && (
                <p className="text-sm text-gray-600 mt-2">{propertyValue.basis}</p>
              )}
            </div>
          )}

          {/* Narrative Report Button */}
          {narrativeReport && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowNarrative(!showNarrative)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {showNarrative ? 'Hide' : 'View'} Detailed Report
              </button>
            </div>
          )}

          {/* Narrative Report Modal */}
          {showNarrative && narrativeReport && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Detailed Survey Report</h3>
                  <button
                    onClick={() => setShowNarrative(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: narrativeReport.replace(/\n/g, '<br />') }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SceneAnalysisWithMap;