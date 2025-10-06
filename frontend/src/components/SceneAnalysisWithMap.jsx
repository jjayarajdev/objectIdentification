import React, { useState, useEffect, useRef } from 'react';
import { MapPin, FileText, ChevronDown, ChevronRight, Download, Eye, X } from 'lucide-react';
import exifr from 'exifr';

const SceneAnalysisWithMap = ({ analysis, fileName, imageFile }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showNarrative, setShowNarrative] = useState(false);
  const [gpsData, setGpsData] = useState(null);
  const [address, setAddress] = useState('');
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (imageFile) {
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
  const itemsData = analysis.simplified_data || analysis.simplifiedData || [];
  const keyObservations = analysis.key_observations || analysis.keyObservations || [];
  const narrativeReport = analysis.narrative_report || analysis.narrativeReport;
  const propertyValue = analysis.estimated_property_value || analysis.estimatedPropertyValue;
  const sceneType = analysis.scene_type || analysis.sceneType || 'Unknown';

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
          {/* Map and Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Location Map */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Property Location
              </h4>
              {gpsData ? (
                <div>
                  <div ref={mapRef} className="w-full h-64 rounded-lg border border-gray-300" />
                  {address && (
                    <p className="mt-2 text-sm text-gray-600">
                      <strong>Address:</strong> {address}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    GPS: {gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)}
                  </p>
                </div>
              ) : (
                <div className="w-full h-64 rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No location data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Scene Overview */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Scene Overview</h4>
              <p className="text-gray-700 leading-relaxed">{sceneOverview}</p>
            </div>
          </div>

          {/* Detected Items Table */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Detected Items & Features</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Category</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Details</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsData.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2 font-medium">
                        {item.identifier || item.category}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {item.details || item.description}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {item.estimated_cost || item.estimatedCost || '—'}
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