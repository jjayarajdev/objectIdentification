import React, { useState, useEffect } from 'react';
import { MapPin, FileText, Download, Calendar, Clock, Building, DollarSign, AlertCircle, Package, Edit3, Save, X, Plus, Trash2 } from 'lucide-react';
import exportService from '../utils/exportService';

const AnalysisDisplay = ({ analysis }) => {
  if (!analysis) return null;

  // Parse the analysis data if it's a string
  const data = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;

  // State for editable table data
  const [tableData, setTableData] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Initialize table data when analysis changes
  useEffect(() => {
    const initialData = parseDetectedItems(data.simplified_data);
    setTableData(initialData);
  }, [data.simplified_data]);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '—';
    if (amount.includes('₹')) return amount;
    return `₹${amount}`;
  };

  // Parse detected items from simplified_data
  const parseDetectedItems = (items) => {
    if (!items) return [];

    let itemsList = [];
    let itemNumber = 1;

    console.log('Parsing items:', items); // Debug log

    // Handle different data structures
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (typeof item === 'object') {
          // Check if item already has the new format with category, object, details, position
          if (item.category && item.object && item.details && item.position) {
            itemsList.push({
              number: itemNumber++,
              category: item.category,
              object: item.object,
              description: item.details,
              position: item.position
            });
          }
          // Handle old format with identifier field
          else if (item.identifier) {
            // Try to extract category from details if available
            let category = 'General';
            let objectName = item.identifier;
            let details = item.details || '';

            // Common category patterns to look for - ordered by priority
            const categoryPatterns = [
              ['People', /\b(person|people|pedestrian|man|woman|men|women|individual|crowd|group|child|children|adult|visitor|staff|worker|employee|seated|standing)\b/i],
              ['Furniture', /\b(chair|table|desk|sofa|couch|cabinet|shelf|furniture|seat|bench|stool|ottoman|dresser|wardrobe|coffee table)\b/i],
              ['Vehicle', /\b(vehicle|car|truck|van|bus|sedan|suv|automobile|motorbike|bike|scooter|parked)\b/i],
              ['Plants', /\b(plant|tree|palm|vegetation|grass|flower|garden|landscaping|foliage|greenery|shrub|bush)\b/i],
              ['Lighting', /\b(light|lamp|bulb|illumination|fixture|led|chandelier|pendant|spotlight|lighting)\b/i],
              ['Traffic Control', /\b(cone|traffic|barrier|sign|signal|roadblock|caution|barricade)\b/i],
              ['Building Element', /\b(wall|door|window|tunnel|gate|entrance|ceiling|floor|roof|facade|building|partition|column|beam)\b/i],
              ['Infrastructure', /\b(cable|wire|pipe|electrical|utility|power|plumbing|duct|conduit)\b/i],
              ['Signage', /\b(sign|board|label|marking|text|poster|billboard|display)\b/i],
              ['Pavement', /\b(pavement|road|driveway|concrete|asphalt|surface|ground|sidewalk)\b/i],
              ['Safety', /\b(safety|emergency|exit|warning|hazard|security|alarm|sprinkler)\b/i],
              ['Equipment', /\b(equipment|machine|tool|device|appliance|instrument|apparatus)\b/i]
            ];

            // Check identifier and details for category patterns
            const textToCheck = `${item.identifier} ${details}`.toLowerCase();
            for (const [cat, pattern] of categoryPatterns) {
              if (pattern.test(textToCheck)) {
                category = cat;
                break;
              }
            }

            // Try to extract a cleaner object name from details
            if (details) {
              const firstPart = details.split(',')[0].trim();
              if (firstPart && firstPart.length < 50) {
                objectName = firstPart;
              }
            }

            itemsList.push({
              number: itemNumber++,
              category: category,
              object: objectName,
              description: details,
              position: item.position || extractPosition(details)
            });
          }
          // Handle format with only details field
          else if (item.details) {
            // Try to parse category from the details
            let category = 'General';
            let objectName = item.details.split(',')[0].substring(0, 50);

            const categoryPatterns = [
              ['People', /\b(person|people|pedestrian|man|woman|men|women|individual|crowd|group|child|children|adult|visitor|staff|worker|employee|seated|standing)\b/i],
              ['Furniture', /\b(chair|table|desk|sofa|couch|cabinet|shelf|furniture|seat|bench|stool|ottoman|dresser|wardrobe|coffee table)\b/i],
              ['Vehicle', /\b(vehicle|car|truck|van|bus|sedan|suv|automobile|motorbike|bike|scooter|parked)\b/i],
              ['Plants', /\b(plant|tree|palm|vegetation|grass|flower|garden|landscaping|foliage|greenery|shrub|bush)\b/i],
              ['Lighting', /\b(light|lamp|bulb|illumination|fixture|led|chandelier|pendant|spotlight|lighting)\b/i],
              ['Traffic Control', /\b(cone|traffic|barrier|sign|signal|roadblock|caution|barricade)\b/i],
              ['Building Element', /\b(wall|door|window|tunnel|gate|entrance|ceiling|floor|roof|facade|building|partition|column|beam)\b/i],
              ['Infrastructure', /\b(cable|wire|pipe|electrical|utility|power|plumbing|duct|conduit)\b/i],
              ['Signage', /\b(sign|board|label|marking|text|poster|billboard|display)\b/i],
              ['Pavement', /\b(pavement|road|driveway|concrete|asphalt|surface|ground|sidewalk)\b/i],
              ['Safety', /\b(safety|emergency|exit|warning|hazard|security|alarm|sprinkler)\b/i],
              ['Equipment', /\b(equipment|machine|tool|device|appliance|instrument|apparatus)\b/i]
            ];

            const textToCheck = item.details.toLowerCase();
            for (const [cat, pattern] of categoryPatterns) {
              if (pattern.test(textToCheck)) {
                category = cat;
                break;
              }
            }

            itemsList.push({
              number: itemNumber++,
              category: category,
              object: objectName,
              description: item.details,
              position: item.position || extractPosition(item.details)
            });
          }
        }
      });
    } else if (typeof items === 'object') {
      // Handle object format (backward compatibility)
      Object.entries(items).forEach(([category, details]) => {
        const detailsArray = Array.isArray(details) ? details : [details];
        detailsArray.forEach(detail => {
          const detailStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
          itemsList.push({
            number: itemNumber++,
            category: category.replace(/_/g, ' '),
            object: detailStr.split(',')[0].substring(0, 50) || detailStr,
            description: detailStr,
            position: extractPosition(detailStr)
          });
        });
      });
    }

    console.log('Parsed items list:', itemsList); // Debug log
    return itemsList;
  };

  // Helper function to extract position from text
  const extractPosition = (text) => {
    if (!text) return '';
    const positionMatches = text.match(/positioned\s+([^,]+)|on\s+the\s+([^,]+)|in\s+the\s+([^,]+)|at\s+([^,]+)|along\s+([^,]+)|center|left|right|top|bottom|corner|edge|wall|ceiling|floor/i);
    if (positionMatches) {
      return positionMatches[0] || '';
    }
    return '';
  };

  // Helper functions for table editing
  const handleEditClick = (item) => {
    setEditingId(item.number);
    setEditValues({
      category: item.category,
      object: item.object,
      description: item.description,
      position: item.position || ''
    });
  };

  const handleSaveEdit = (itemNumber) => {
    setTableData(prev => prev.map(item =>
      item.number === itemNumber
        ? { ...item, ...editValues }
        : item
    ));
    setEditingId(null);
    setEditValues({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleAddRow = () => {
    const maxNumber = Math.max(...tableData.map(item => item.number), 0);
    const newRow = {
      number: maxNumber + 1,
      category: 'General',
      object: 'New Item',
      description: 'Enter description',
      position: 'Enter position'
    };
    setTableData(prev => [...prev, newRow]);
    handleEditClick(newRow);
  };

  const handleRemoveRow = (itemNumber) => {
    setTableData(prev => {
      const filtered = prev.filter(item => item.number !== itemNumber);
      // Renumber items to maintain sequential numbering
      return filtered.map((item, index) => ({ ...item, number: index + 1 }));
    });
    if (editingId === itemNumber) {
      setEditingId(null);
      setEditValues({});
    }
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header with Image Info */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold">{data.filename || 'Analysis Result'}</h3>
            <p className="text-sm text-gray-500">
              {data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                console.log('Attempting Word export with data:', data);

                // Ensure data is in the correct format for export
                const exportData = [{
                  fileName: data.filename || data.fileName || 'Analysis',
                  filename: data.filename || data.fileName || 'Analysis',
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
                  imageFile: data.imageFile // Include the image file if available
                }];

                console.log('Formatted export data:', exportData);

                await exportService.exportToWord(exportData, {
                  name: data.filename || data.fileName || 'Analysis',
                  client: 'CBRE'
                });

                console.log('Word export completed successfully');
              } catch (error) {
                console.error('Export failed:', error);
                console.error('Error stack:', error.stack);
                alert(`Failed to export to Word: ${error.message}`);
              }
            }}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Download as Word Document
          </button>
        </div>
      </div>

      {/* Scene Type Badge */}
      {data.scene_type && (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
          <Building className="w-4 h-4" />
          <span className="text-sm font-medium capitalize">{data.scene_type}</span>
        </div>
      )}

      {/* Location Information */}
      {data.gps && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-1" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-2">Property Location</h4>
              {data.gps.address && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Address:</span> {data.gps.address}
                </p>
              )}
              {(data.gps.latitude && data.gps.longitude) && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">GPS:</span> {data.gps.latitude}, {data.gps.longitude}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scene Overview */}
      {data.scene_overview && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Scene Overview</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{data.scene_overview}</p>
        </div>
      )}

      {/* Detected Items & Features */}
      {data.simplified_data && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Detected Items & Features</h4>
            <button
              onClick={handleAddRow}
              className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-r">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r">
                    Object / Person
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-r">
                    Position in Image
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.map((item) => (
                  <tr key={item.number} className={`hover:bg-gray-50 ${editingId === item.number ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-3 text-sm text-center text-gray-700 font-medium border-r">
                      {item.number}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">
                      {editingId === item.number ? (
                        <select
                          value={editValues.category || ''}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="General">General</option>
                          <option value="People">People</option>
                          <option value="Furniture">Furniture</option>
                          <option value="Vehicle">Vehicle</option>
                          <option value="Plants">Plants</option>
                          <option value="Lighting">Lighting</option>
                          <option value="Traffic Control">Traffic Control</option>
                          <option value="Building Element">Building Element</option>
                          <option value="Infrastructure">Infrastructure</option>
                          <option value="Signage">Signage</option>
                          <option value="Pavement">Pavement</option>
                          <option value="Safety">Safety</option>
                          <option value="Equipment">Equipment</option>
                        </select>
                      ) : (
                        item.category.charAt(0).toUpperCase() + item.category.slice(1)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 border-r">
                      {editingId === item.number ? (
                        <input
                          type="text"
                          value={editValues.object || ''}
                          onChange={(e) => handleInputChange('object', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        item.object
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r">
                      {editingId === item.number ? (
                        <textarea
                          value={editValues.description || ''}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm resize-none"
                          rows="2"
                        />
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 border-r">
                      {editingId === item.number ? (
                        <input
                          type="text"
                          value={editValues.position || ''}
                          onChange={(e) => handleInputChange('position', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        item.position || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {editingId === item.number ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSaveEdit(item.number)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="Save changes"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Cancel editing"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Edit row"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveRow(item.number)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Delete row"
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
      )}

      {/* Key Observations */}
      {data.key_observations && data.key_observations.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Key Observations
          </h4>
          <ul className="space-y-2">
            {data.key_observations.map((observation, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span className="text-sm text-gray-700">{observation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Estimated Property Value */}
      {data.estimated_property_value && (
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <h4 className="font-medium text-gray-900">Estimated Property Value</h4>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(data.estimated_property_value)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Narrative Report */}
      {data.narrative_report && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Detailed Report</h4>
          <div className="prose prose-sm max-w-none text-gray-700">
            {data.narrative_report.split('\n').map((paragraph, idx) => (
              <p key={idx} className="mb-3">{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      {/* API Metadata */}
      {(data.tokens_used || data.cost_usd || data.processing_time_ms) && (
        <div className="flex gap-4 text-xs text-gray-500">
          {data.tokens_used && (
            <span>Tokens: {data.tokens_used.toLocaleString()}</span>
          )}
          {data.cost_usd && (
            <span>Cost: ${data.cost_usd.toFixed(4)}</span>
          )}
          {data.processing_time_ms && (
            <span>Time: {data.processing_time_ms}ms</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisDisplay;