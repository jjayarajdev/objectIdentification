import React from 'react';
import { Camera, MapPin, Calendar, Settings } from 'lucide-react';

const ExifMetadata = ({ metadata, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">EXIF Metadata</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">EXIF Metadata</h3>
        <p className="text-gray-500 text-sm">No metadata available</p>
      </div>
    );
  }

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    return value;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5 text-blue-600" />
        EXIF Metadata
      </h3>

      <div className="space-y-3">
        {/* Camera Info */}
        <div className="border-b pb-3">
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Camera className="w-4 h-4" />
            Camera Information
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Make:</span>
              <span className="ml-2 text-gray-800">{formatValue(metadata.make)}</span>
            </div>
            <div>
              <span className="text-gray-500">Model:</span>
              <span className="ml-2 text-gray-800">{formatValue(metadata.model)}</span>
            </div>
            <div>
              <span className="text-gray-500">Software:</span>
              <span className="ml-2 text-gray-800">{formatValue(metadata.software)}</span>
            </div>
          </div>
        </div>

        {/* Image Settings */}
        <div className="border-b pb-3">
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Settings className="w-4 h-4" />
            Image Settings
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Dimensions:</span>
              <span className="ml-2 text-gray-800">
                {metadata.image_width && metadata.image_height
                  ? `${metadata.image_width} × ${metadata.image_height}`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">ISO:</span>
              <span className="ml-2 text-gray-800">{formatValue(metadata.iso)}</span>
            </div>
            <div>
              <span className="text-gray-500">Focal Length:</span>
              <span className="ml-2 text-gray-800">{formatValue(metadata.focal_length)}</span>
            </div>
            <div>
              <span className="text-gray-500">F-Number:</span>
              <span className="ml-2 text-gray-800">{formatValue(metadata.f_number)}</span>
            </div>
            <div>
              <span className="text-gray-500">Exposure:</span>
              <span className="ml-2 text-gray-800">{formatValue(metadata.exposure_time)}</span>
            </div>
            <div>
              <span className="text-gray-500">Orientation:</span>
              <span className="ml-2 text-gray-800">{formatValue(metadata.orientation)}</span>
            </div>
          </div>
        </div>

        {/* Date and Location */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Date & Location</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500">Date:</span>
              <span className="text-gray-800">{formatValue(metadata.datetime)}</span>
            </div>
            {(metadata.gps_latitude && metadata.gps_longitude) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">GPS:</span>
                <span className="text-gray-800">
                  {metadata.gps_latitude.toFixed(6)}, {metadata.gps_longitude.toFixed(6)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Data */}
        {metadata.additional_data && Object.keys(metadata.additional_data).length > 0 && (
          <div className="pt-3 border-t">
            <details className="cursor-pointer">
              <summary className="font-medium text-gray-700 text-sm">
                Additional Metadata ({Object.keys(metadata.additional_data).length} fields)
              </summary>
              <div className="mt-2 space-y-1 text-xs">
                {Object.entries(metadata.additional_data).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="text-gray-500 w-32 flex-shrink-0">{key}:</span>
                    <span className="text-gray-700">{String(value)}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExifMetadata;