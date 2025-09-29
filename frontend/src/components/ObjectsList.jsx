import React from 'react';
import { Box, Tag, Eye } from 'lucide-react';

const ObjectsList = ({ objects, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-600" />
          Detected Objects
        </h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!objects || objects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-600" />
          Detected Objects
        </h3>
        <p className="text-gray-500 text-sm">No objects detected yet</p>
      </div>
    );
  }

  // Group objects by label and count
  const objectCounts = objects.reduce((acc, obj) => {
    const label = obj.label || 'Unknown';
    if (!acc[label]) {
      acc[label] = { count: 0, confidences: [] };
    }
    acc[label].count++;
    acc[label].confidences.push(obj.confidence || 0);
    return acc;
  }, {});

  // Sort by count (descending)
  const sortedObjects = Object.entries(objectCounts)
    .sort(([, a], [, b]) => b.count - a.count);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Eye className="w-5 h-5 text-purple-600" />
        Detected Objects ({objects.length})
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xs text-purple-600 font-medium">Total Objects</p>
          <p className="text-2xl font-bold text-purple-800">{objects.length}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Unique Types</p>
          <p className="text-2xl font-bold text-blue-800">{sortedObjects.length}</p>
        </div>
      </div>

      {/* Objects List */}
      <div className="space-y-2">
        {sortedObjects.map(([label, data]) => {
          const avgConfidence =
            data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length;

          return (
            <div
              key={label}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-800">{label}</span>
                {data.count > 1 && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                    ×{data.count}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Confidence:</span>
                <div className="flex items-center gap-1">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${avgConfidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {(avgConfidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Individual Objects Details */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
          View all {objects.length} detections
        </summary>
        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
          {objects.map((obj, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs p-1 hover:bg-gray-50 rounded"
            >
              <span className="text-gray-600">
                #{index + 1} {obj.label}
              </span>
              <span className="text-gray-500">
                {(obj.confidence * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default ObjectsList;