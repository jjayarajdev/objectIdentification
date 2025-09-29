import React, { useState, useMemo } from 'react';
import { Box, Eye, AlertCircle, Info, Filter, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';

const ObjectsTable = ({ objects, loading = false, imageAnalysis = null }) => {
  const [sortField, setSortField] = useState('confidence');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Group objects by category
  const categorizeObjects = () => {
    const categories = {
      'Vehicles': ['car', 'vehicle', 'bus', 'truck', 'motorcycle', 'bicycle'],
      'People': ['person', 'people', 'man', 'woman', 'child'],
      'Infrastructure': ['building', 'road', 'bridge', 'parking', 'garage', 'entrance', 'tunnel'],
      'Safety Equipment': ['traffic cone', 'cone', 'barrier', 'sign', 'bollard'],
      'Natural Elements': ['tree', 'plant', 'palm', 'foliage', 'vegetation'],
      'Other': []
    };

    const categorized = {
      'Vehicles': [],
      'People': [],
      'Infrastructure': [],
      'Safety Equipment': [],
      'Natural Elements': [],
      'Other': []
    };

    objects.forEach(obj => {
      let found = false;
      for (const [category, keywords] of Object.entries(categories)) {
        if (category !== 'Other' && keywords.some(keyword =>
          obj.label.toLowerCase().includes(keyword)
        )) {
          categorized[category].push(obj);
          found = true;
          break;
        }
      }
      if (!found) {
        categorized['Other'].push(obj);
      }
    });

    return categorized;
  };

  // Filter and sort objects
  const filteredAndSortedObjects = useMemo(() => {
    if (!objects || objects.length === 0) {
      return [];
    }
    let filtered = [...objects];

    // Apply text filter
    if (filterText) {
      filtered = filtered.filter(obj =>
        obj.label.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      const categoryKeywords = {
        'Vehicles': ['car', 'vehicle', 'bus', 'truck', 'motorcycle', 'bicycle'],
        'People': ['person', 'people', 'man', 'woman', 'child'],
        'Infrastructure': ['building', 'road', 'bridge', 'parking', 'garage', 'entrance', 'tunnel'],
        'Safety Equipment': ['traffic cone', 'cone', 'barrier', 'sign', 'bollard'],
        'Natural Elements': ['tree', 'plant', 'palm', 'foliage', 'vegetation'],
      };

      if (categoryKeywords[selectedCategory]) {
        filtered = filtered.filter(obj =>
          categoryKeywords[selectedCategory].some(keyword =>
            obj.label.toLowerCase().includes(keyword)
          )
        );
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'label':
          aVal = a.label.toLowerCase();
          bVal = b.label.toLowerCase();
          break;
        case 'confidence':
          aVal = a.confidence;
          bVal = b.confidence;
          break;
        case 'size':
          aVal = (a.bounding_box?.width || 0) * (a.bounding_box?.height || 0);
          bVal = (b.bounding_box?.width || 0) * (b.bounding_box?.height || 0);
          break;
        default:
          aVal = a.confidence;
          bVal = b.confidence;
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [objects, filterText, selectedCategory, sortField, sortDirection]);

  const categorized = categorizeObjects();

  // Calculate statistics based on filtered objects
  const avgConfidence = filteredAndSortedObjects.length > 0
    ? filteredAndSortedObjects.reduce((acc, obj) => acc + obj.confidence, 0) / filteredAndSortedObjects.length
    : 0;
  const highConfidenceCount = filteredAndSortedObjects.filter(obj => obj.confidence > 0.9).length;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-600" />
          Analyzing Image...
        </h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (!objects || objects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-600" />
          Object Detection Results
        </h3>
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">No objects detected yet. Upload an image to begin analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-600" />
          Detection Summary
        </h3>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-xs text-purple-600 font-medium">Total Objects</p>
            <p className="text-3xl font-bold text-purple-800">{objects?.length || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600 font-medium">Categories</p>
            <p className="text-3xl font-bold text-blue-800">
              {Object.values(categorized).filter(arr => arr.length > 0).length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-600 font-medium">Avg Confidence</p>
            <p className="text-3xl font-bold text-green-800">{(avgConfidence * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-xs text-orange-600 font-medium">High Confidence</p>
            <p className="text-3xl font-bold text-orange-800">{highConfidenceCount}</p>
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      {imageAnalysis && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Comprehensive Image Analysis
          </h3>
          <div className="prose prose-sm max-w-none text-gray-700">
            <p className="whitespace-pre-wrap">{imageAnalysis}</p>
          </div>
        </div>
      )}

      {/* Objects Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Detected Objects Table
        </h3>

        {/* Filter Controls */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search Filter */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by object name..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="min-w-[180px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Vehicles">Vehicles</option>
                <option value="People">People</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Safety Equipment">Safety Equipment</option>
                <option value="Natural Elements">Natural Elements</option>
              </select>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="confidence">Sort by Confidence</option>
                <option value="label">Sort by Label</option>
                <option value="size">Sort by Size</option>
              </select>

              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                title={sortDirection === 'asc' ? 'Sort descending' : 'Sort ascending'}
              >
                {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Clear Filters */}
            {(filterText || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setFilterText('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Results Count */}
          {(filterText || selectedCategory !== 'all') && (
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedObjects.length} of {objects.length} objects
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Object
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedObjects.map((obj, index) => {
                // Find category for this object
                let objCategory = 'Other';
                for (const [category, items] of Object.entries(categorized)) {
                  if (items.includes(obj)) {
                    objCategory = category;
                    break;
                  }
                }

                const bbox = obj.bounding_box || {};

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {obj.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        objCategory === 'Vehicles' ? 'bg-blue-100 text-blue-800' :
                        objCategory === 'People' ? 'bg-green-100 text-green-800' :
                        objCategory === 'Infrastructure' ? 'bg-purple-100 text-purple-800' :
                        objCategory === 'Safety Equipment' ? 'bg-orange-100 text-orange-800' :
                        objCategory === 'Natural Elements' ? 'bg-teal-100 text-teal-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {objCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              obj.confidence > 0.9 ? 'bg-green-500' :
                              obj.confidence > 0.7 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${obj.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {(obj.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {bbox.x && bbox.y ? `(${bbox.x.toFixed(0)}, ${bbox.y.toFixed(0)})` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {bbox.width && bbox.height ?
                        `${bbox.width.toFixed(0)}×${bbox.height.toFixed(0)}` : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ObjectsTable;