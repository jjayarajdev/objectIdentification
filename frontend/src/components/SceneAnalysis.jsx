import React, { useState, useEffect } from 'react';
import { FileDown, MapPin, Building, Trees, Construction, AlertTriangle, CheckCircle, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

const SceneAnalysis = ({ analysis, loading, onDownloadReport }) => {
  const [editableData, setEditableData] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({ identifier: '', details: '', estimated_cost: '' });
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Initialize editable data when analysis changes
  useEffect(() => {
    if (analysis?.simplified_data) {
      setEditableData([...analysis.simplified_data]);
    } else if (analysis?.analysis_data) {
      // Convert old format to simplified format
      const simplified = [];
      analysis.analysis_data.forEach(category => {
        category.items?.forEach(item => {
          const cost = item.estimated_value && item.estimated_value !== 'N/A'
            ? formatCostRange(item.estimated_value)
            : '—';
          simplified.push({
            identifier: item.item,
            details: `${item.details}${item.quantity && item.quantity !== 'N/A' ? ` (${item.quantity})` : ''}`,
            estimated_cost: cost
          });
        });
      });
      setEditableData(simplified);
    }
  }, [analysis]);

  const formatCostRange = (value) => {
    if (!value || value === 'N/A' || value === '—') return '—';
    if (typeof value === 'object' && value.min && value.max) {
      return `₹${value.min.toLocaleString('en-IN')} – ₹${value.max.toLocaleString('en-IN')}`;
    }
    if (typeof value === 'string' && value.includes('₹')) {
      return value;
    }
    return '—';
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditForm({ ...editableData[index] });
  };

  const handleSave = () => {
    const newData = [...editableData];
    newData[editingIndex] = editForm;
    setEditableData(newData);
    setEditingIndex(null);
    setEditForm({ identifier: '', details: '', estimated_cost: '' });
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm({ identifier: '', details: '', estimated_cost: '' });
  };

  const handleDelete = (index) => {
    const newData = editableData.filter((_, i) => i !== index);
    setEditableData(newData);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditForm({ identifier: '', details: '', estimated_cost: '' });
  };

  const handleSaveNew = () => {
    if (editForm.identifier && editForm.details) {
      setEditableData([...editableData, { ...editForm }]);
      setIsAddingNew(false);
      setEditForm({ identifier: '', details: '', estimated_cost: '' });
    }
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setEditForm({ identifier: '', details: '', estimated_cost: '' });
  };

  const handleInputChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const handleDownloadWithNarrative = async () => {
    try {
      // Send the entire analysis data to backend to generate Word report
      const response = await fetch('http://localhost:8000/api/room-analysis/generate-scene-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...analysis,
          simplified_data: editableData, // Use the current editable data
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.report_url) {
          // Download the generated report
          const downloadUrl = `http://localhost:8000${result.report_url}`;
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = result.report_filename || 'scene_analysis_report.docx';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        console.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Analyzing scene...</p>
        </div>
      </div>
    );
  }

  if (!analysis || analysis.error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-red-400" />
          <p>{analysis?.error || 'No analysis available'}</p>
        </div>
      </div>
    );
  }

  // Map scene types to icons and colors
  const sceneTypeConfig = {
    indoor_office: { icon: Building, color: 'blue', label: 'Indoor Office' },
    indoor_industrial: { icon: Building, color: 'gray', label: 'Industrial Space' },
    building_exterior: { icon: Building, color: 'purple', label: 'Building Exterior' },
    land_property: { icon: MapPin, color: 'green', label: 'Land/Property' },
    construction_site: { icon: Construction, color: 'orange', label: 'Construction Site' },
    infrastructure: { icon: MapPin, color: 'red', label: 'Infrastructure' },
    agricultural: { icon: Trees, color: 'green', label: 'Agricultural' },
    natural_landscape: { icon: Trees, color: 'emerald', label: 'Natural Landscape' },
    parking_area: { icon: MapPin, color: 'indigo', label: 'Parking Area' },
    other: { icon: MapPin, color: 'gray', label: 'Other' }
  };

  const sceneType = analysis.scene_type || 'other';
  const config = sceneTypeConfig[sceneType] || sceneTypeConfig.other;
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${config.color}-100 rounded-lg`}>
              <Icon className={`w-6 h-6 text-${config.color}-600`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Scene Analysis Report</h2>
              <p className="text-sm text-gray-600">Scene Type: <span className="font-semibold">{config.label}</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadWithNarrative}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Download Report
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Scene Overview */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Scene Overview</h3>
        <p className="text-gray-700 leading-relaxed">
          {analysis.scene_overview || 'No overview available'}
        </p>
      </div>

      {/* Simplified Editable Table */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimated Cost
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {editableData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {editingIndex === index ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editForm.identifier}
                          onChange={(e) => handleInputChange('identifier', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editForm.details}
                          onChange={(e) => handleInputChange('details', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editForm.estimated_cost}
                          onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="₹X – ₹Y or —"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={handleSave}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {row.identifier}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {row.details}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {row.estimated_cost || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(index)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {/* Add new row */}
              {isAddingNew && (
                <tr className="bg-blue-50">
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editForm.identifier}
                      onChange={(e) => handleInputChange('identifier', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter identifier"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editForm.details}
                      onChange={(e) => handleInputChange('details', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter details"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editForm.estimated_cost}
                      onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="₹X – ₹Y or —"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={handleSaveNew}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelNew}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editableData.length === 0 && !isAddingNew && (
          <div className="text-center py-8 text-gray-500">
            No analysis data available. Click "Add Item" to start adding data.
          </div>
        )}
      </div>

      {/* Key Observations */}
      {analysis.key_observations && analysis.key_observations.length > 0 && (
        <div className="px-6 py-4 bg-blue-50 border-t">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Key Observations
          </h3>
          <ul className="space-y-2">
            {analysis.key_observations.map((observation, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span className="text-gray-700">{observation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Property Value Estimate */}
      {analysis.estimated_property_value && (analysis.estimated_property_value.min || analysis.estimated_property_value.max) && (
        <div className="px-6 py-4 bg-green-50 border-t">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Estimated Property Value</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">
                ₹{analysis.estimated_property_value.min?.toLocaleString('en-IN')} - ₹{analysis.estimated_property_value.max?.toLocaleString('en-IN')}
              </p>
              {analysis.estimated_property_value.basis && (
                <p className="text-sm text-gray-600 mt-1">{analysis.estimated_property_value.basis}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer with metadata */}
      {analysis.processing_time_seconds && (
        <div className="border-t px-6 py-3 bg-gray-50">
          <p className="text-sm text-gray-500">
            Analysis completed in {analysis.processing_time_seconds.toFixed(2)} seconds using {analysis.model_used || 'GPT-4o'}
            {analysis.analysis_timestamp && ` • ${new Date(analysis.analysis_timestamp).toLocaleString()}`}
          </p>
        </div>
      )}
    </div>
  );
};

export default SceneAnalysis;