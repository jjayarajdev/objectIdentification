import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Image, Map, Eye, X, Maximize2, Info, Navigation } from 'lucide-react';
import exifr from 'exifr';
import { Loader } from '@googlemaps/js-api-loader';

const PhotoLocationViewer = ({ file, imageUrl, onClose }) => {
  const [exifData, setExifData] = useState(null);
  const [gpsData, setGpsData] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // split, image, map
  const [mapType, setMapType] = useState('roadmap'); // roadmap, satellite, hybrid, terrain
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    extractExifData();
  }, [file]);

  useEffect(() => {
    if (gpsData) {
      initializeMap();
    }
  }, [gpsData, mapType]);

  const extractExifData = async () => {
    try {
      setLoading(true);
      const data = await exifr.parse(file, {
        gps: true,
        pick: ['Make', 'Model', 'DateTime', 'DateTimeOriginal', 'FocalLength',
                'FNumber', 'ISO', 'ExposureTime', 'GPSLatitude', 'GPSLongitude']
      });

      if (data) {
        setExifData(data);

        if (data.latitude && data.longitude) {
          setGpsData({
            lat: data.latitude,
            lng: data.longitude
          });
        } else {
          setError('No GPS data found in image EXIF');
        }
      } else {
        setError('No EXIF data found in image');
      }
    } catch (err) {
      console.error('Error extracting EXIF:', err);
      setError('Failed to extract EXIF data');
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = async () => {
    try {
      // Get API key from backend
      const response = await fetch('http://localhost:8000/api/config/maps-key');
      const config = await response.json();

      if (!config.apiKey) {
        setError('Google Maps API key not configured');
        return;
      }

      const loader = new Loader({
        apiKey: config.apiKey,
        version: 'weekly',
        libraries: ['places', 'geocoding']
      });

      const { Map } = await loader.importLibrary('maps');
      const { Marker } = await loader.importLibrary('marker');
      const { Geocoder } = await loader.importLibrary('geocoding');

      // Initialize map
      if (mapRef.current) {
        const map = new Map(mapRef.current, {
          center: gpsData,
          zoom: 17,
          mapTypeId: mapType,
          streetViewControl: true,
          fullscreenControl: true,
          mapTypeControl: true,
          zoomControl: true,
          scaleControl: true
        });

        mapInstanceRef.current = map;

        // Add marker
        const marker = new Marker({
          position: gpsData,
          map: map,
          title: file.name,
          animation: window.google.maps.Animation.DROP
        });

        markerRef.current = marker;

        // Get address using reverse geocoding
        const geocoder = new Geocoder();
        geocoder.geocode({ location: gpsData }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setAddress(results[0].formatted_address);
          }
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px;">
              <h3 style="margin: 0 0 10px 0; font-weight: 600;">${file.name}</h3>
              <p style="margin: 5px 0;">📍 ${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)}</p>
              ${address ? `<p style="margin: 5px 0;">📍 ${address}</p>` : ''}
              ${exifData?.DateTimeOriginal ? `<p style="margin: 5px 0;">📅 ${new Date(exifData.DateTimeOriginal).toLocaleString()}</p>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      }
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to load Google Maps');
    }
  };

  const openInGoogleMaps = () => {
    if (gpsData) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${gpsData.lat},${gpsData.lng}`, '_blank');
    }
  };

  const copyCoordinates = () => {
    if (gpsData) {
      navigator.clipboard.writeText(`${gpsData.lat}, ${gpsData.lng}`);
    }
  };

  const formatExposureTime = (time) => {
    if (time < 1) {
      return `1/${Math.round(1/time)}`;
    }
    return `${time}s`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4">Extracting location data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Photo Location Viewer</h2>

            {/* View Mode Buttons */}
            <div className="flex gap-2 border-l pl-4">
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded flex items-center gap-2 ${
                  viewMode === 'split' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                <Maximize2 className="w-4 h-4" />
                Split View
              </button>
              <button
                onClick={() => setViewMode('image')}
                className={`px-3 py-1.5 rounded flex items-center gap-2 ${
                  viewMode === 'image' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                <Image className="w-4 h-4" />
                Image Only
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded flex items-center gap-2 ${
                  viewMode === 'map' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
                disabled={!gpsData}
              >
                <Map className="w-4 h-4" />
                Map Only
              </button>
            </div>

            {/* Map Type Selector */}
            {gpsData && viewMode !== 'image' && (
              <select
                value={mapType}
                onChange={(e) => setMapType(e.target.value)}
                className="px-3 py-1.5 border rounded"
              >
                <option value="roadmap">Road Map</option>
                <option value="satellite">Satellite</option>
                <option value="hybrid">Hybrid</option>
                <option value="terrain">Terrain</option>
              </select>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Image Panel */}
        {(viewMode === 'image' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} bg-gray-900 flex flex-col`}>
            <div className="flex-1 flex items-center justify-center p-4">
              <img
                src={imageUrl}
                alt={file.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Map Panel */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} bg-gray-100 flex flex-col`}>
            {gpsData ? (
              <div ref={mapRef} className="flex-1" />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-8">
                  <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">{error || 'No location data available'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div className="bg-white border-t p-4">
        <div className="flex items-start justify-between">
          {/* EXIF Data */}
          <div className="flex-1">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Image Information
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">File:</span>
                <span className="ml-2 font-medium">{file.name}</span>
              </div>
              {exifData?.Make && (
                <div>
                  <span className="text-gray-500">Camera:</span>
                  <span className="ml-2 font-medium">{exifData.Make} {exifData.Model}</span>
                </div>
              )}
              {exifData?.DateTimeOriginal && (
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(exifData.DateTimeOriginal).toLocaleDateString()}
                  </span>
                </div>
              )}
              {exifData?.FocalLength && (
                <div>
                  <span className="text-gray-500">Focal:</span>
                  <span className="ml-2 font-medium">{exifData.FocalLength}mm</span>
                </div>
              )}
              {exifData?.FNumber && (
                <div>
                  <span className="text-gray-500">Aperture:</span>
                  <span className="ml-2 font-medium">f/{exifData.FNumber}</span>
                </div>
              )}
              {exifData?.ISO && (
                <div>
                  <span className="text-gray-500">ISO:</span>
                  <span className="ml-2 font-medium">{exifData.ISO}</span>
                </div>
              )}
              {exifData?.ExposureTime && (
                <div>
                  <span className="text-gray-500">Shutter:</span>
                  <span className="ml-2 font-medium">{formatExposureTime(exifData.ExposureTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Location Data */}
          {gpsData && (
            <div className="border-l pl-4 ml-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Coordinates:</span>
                  <span className="ml-2 font-medium">
                    {gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)}
                  </span>
                  <button
                    onClick={copyCoordinates}
                    className="ml-2 text-blue-600 hover:text-blue-700"
                  >
                    Copy
                  </button>
                </div>
                {address && (
                  <div>
                    <span className="text-gray-500">Address:</span>
                    <span className="ml-2 font-medium">{address}</span>
                  </div>
                )}
                <button
                  onClick={openInGoogleMaps}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Open in Google Maps
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoLocationViewer;