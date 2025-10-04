import React, { useState } from 'react';
import { Building, Download, Users, Thermometer, Lightbulb, Leaf, Smartphone, DollarSign, Loader, FileDown } from 'lucide-react';

const RoomAnalysis = ({ analysis, loading, onDownloadReport }) => {
  const [activeSection, setActiveSection] = useState('summary');

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Analyzing room intelligence...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <Building className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Upload an image to see comprehensive room analysis</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'summary', label: 'Summary', icon: Building },
    { id: 'people', label: 'People', icon: Users },
    { id: 'temperature', label: 'Environment', icon: Thermometer },
    { id: 'furniture', label: 'Furniture', icon: Building },
    { id: 'lighting', label: 'Lighting', icon: Lightbulb },
    { id: 'plants', label: 'Plants', icon: Leaf },
    { id: 'electronics', label: 'Electronics', icon: Smartphone },
    { id: 'costs', label: 'Cost Analysis', icon: DollarSign },
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'summary':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Executive Summary</h3>
              <p className="text-gray-700 leading-relaxed">
                {analysis.detailed_narrative || 'Comprehensive room analysis completed successfully.'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <p className="text-sm text-gray-500">Room Type</p>
                <p className="text-lg font-semibold">{analysis.room_classification?.primary_use || 'N/A'}</p>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <p className="text-sm text-gray-500">Design Style</p>
                <p className="text-lg font-semibold">{analysis.room_classification?.design_style || 'N/A'}</p>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <p className="text-sm text-gray-500">Area</p>
                <p className="text-lg font-semibold">{analysis.room_metrics?.total_area_sqft || 0} sq ft</p>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <p className="text-sm text-gray-500">Total Estimate</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(analysis.cost_summary?.complete_room_estimate?.min || 0)}
                </p>
              </div>
            </div>
          </div>
        );

      case 'people':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">People Analysis</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-500">Total Count</p>
                  <p className="text-2xl font-bold text-blue-600">{analysis.people_analysis?.total_count || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-500">Sitting</p>
                  <p className="text-2xl font-bold text-green-600">{analysis.people_analysis?.sitting || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-500">Standing</p>
                  <p className="text-2xl font-bold text-orange-600">{analysis.people_analysis?.standing || 0}</p>
                </div>
              </div>
              <p className="text-gray-700">{analysis.people_analysis?.details || 'No additional details available.'}</p>
            </div>
          </div>
        );

      case 'temperature':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Environmental Conditions</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Temperature Range:</span>
                  <span className="font-semibold">
                    {analysis.temperature?.estimated_range_celsius?.min || 0}°C - {analysis.temperature?.estimated_range_celsius?.max || 0}°C
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">HVAC Setting:</span>
                  <span className="font-semibold">{analysis.temperature?.hvac_setting || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Comfort Level:</span>
                  <span className="font-semibold">{analysis.temperature?.comfort_assessment || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">AC Type:</span>
                  <span className="font-semibold">{analysis.hvac_and_blinds?.ac_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Blinds:</span>
                  <span className="font-semibold">{analysis.hvac_and_blinds?.blinds_type || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'furniture':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Furniture Inventory</h3>
            <div className="grid gap-3">
              {analysis.furniture?.map((item, index) => (
                <div key={index} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg">{item.item}</h4>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} | Material: {item.material} | Style: {item.style}
                      </p>
                      <p className="text-sm text-gray-500">Condition: {item.condition}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Estimated Cost</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(item.estimated_cost_inr?.min || 0)} - {formatCurrency(item.estimated_cost_inr?.max || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )) || <p className="text-gray-500">No furniture detected</p>}
            </div>
          </div>
        );

      case 'lighting':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Lighting Systems</h3>
            <div className="grid gap-3">
              {analysis.lighting?.map((light, index) => (
                <div key={index} className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{light.type}</h4>
                      <p className="text-sm text-gray-600">Quantity: {light.quantity} | Style: {light.style}</p>
                    </div>
                    <p className="font-semibold text-amber-600">
                      {formatCurrency(light.estimated_cost_inr?.min || 0)} - {formatCurrency(light.estimated_cost_inr?.max || 0)}
                    </p>
                  </div>
                </div>
              )) || <p className="text-gray-500">No lighting fixtures detected</p>}
            </div>
          </div>
        );

      case 'plants':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Plants & Greenery</h3>
            <div className="grid gap-3">
              {analysis.plants?.map((plant, index) => (
                <div key={index} className="bg-green-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{plant.common_name}</h4>
                      <p className="text-sm italic text-gray-600">{plant.scientific_name}</p>
                      <p className="text-sm text-gray-600">Size: {plant.size}</p>
                    </div>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(plant.estimated_cost_inr?.min || 0)} - {formatCurrency(plant.estimated_cost_inr?.max || 0)}
                    </p>
                  </div>
                </div>
              )) || <p className="text-gray-500">No plants detected</p>}
            </div>
          </div>
        );

      case 'electronics':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Electronics & Devices</h3>
            <div className="grid gap-3">
              {analysis.electronics?.map((device, index) => (
                <div key={index} className="bg-purple-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{device.device}</h4>
                      <p className="text-sm text-gray-600">
                        Brand: {device.brand_guess} | Quantity: {device.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-purple-600">
                      {formatCurrency(device.estimated_cost_inr?.min || 0)} - {formatCurrency(device.estimated_cost_inr?.max || 0)}
                    </p>
                  </div>
                </div>
              )) || <p className="text-gray-500">No electronics detected</p>}
            </div>
          </div>
        );

      case 'costs':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Cost Analysis</h3>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Category</th>
                    <th className="text-right py-2">Estimated Range (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3">Furniture</td>
                    <td className="text-right font-semibold">
                      {formatCurrency(analysis.cost_summary?.furniture_total?.min || 0)} - {formatCurrency(analysis.cost_summary?.furniture_total?.max || 0)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">Lighting</td>
                    <td className="text-right font-semibold">
                      {formatCurrency(analysis.cost_summary?.lighting_total?.min || 0)} - {formatCurrency(analysis.cost_summary?.lighting_total?.max || 0)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">Flooring</td>
                    <td className="text-right font-semibold">
                      {formatCurrency(analysis.cost_summary?.flooring_total?.min || 0)} - {formatCurrency(analysis.cost_summary?.flooring_total?.max || 0)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">Plants</td>
                    <td className="text-right font-semibold">
                      {formatCurrency(analysis.cost_summary?.plants_total?.min || 0)} - {formatCurrency(analysis.cost_summary?.plants_total?.max || 0)}
                    </td>
                  </tr>
                  <tr className="font-bold text-lg">
                    <td className="py-3">Total Estimate</td>
                    <td className="text-right text-green-600">
                      {formatCurrency(analysis.cost_summary?.complete_room_estimate?.min || 0)} - {formatCurrency(analysis.cost_summary?.complete_room_estimate?.max || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Flooring Details</h4>
              <div className="space-y-1 text-sm">
                <p>Type: {analysis.flooring?.type || 'N/A'}</p>
                <p>Material: {analysis.flooring?.material || 'N/A'}</p>
                <p>Pattern: {analysis.flooring?.pattern || 'N/A'}</p>
                <p>Cost per sq ft: {formatCurrency(analysis.flooring?.cost_per_sqft_inr?.min || 0)} - {formatCurrency(analysis.flooring?.cost_per_sqft_inr?.max || 0)}</p>
                <p>Total Area: {analysis.flooring?.total_area_sqft || 0} sq ft</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Room Intelligence Analysis</h2>
          {analysis.report_url && (
            <button
              onClick={() => onDownloadReport(analysis.report_url)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Download Report
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b overflow-x-auto">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors ${
              activeSection === id
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {renderSection()}
      </div>

      {analysis.processing_time_seconds && (
        <div className="border-t px-6 py-3 bg-gray-50">
          <p className="text-sm text-gray-500">
            Analysis completed in {analysis.processing_time_seconds.toFixed(2)} seconds using {analysis.model_used || 'GPT-4o'}
          </p>
        </div>
      )}
    </div>
  );
};

export default RoomAnalysis;