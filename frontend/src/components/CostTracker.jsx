import React from 'react';
import { DollarSign, Hash, TrendingUp } from 'lucide-react';

const CostTracker = ({ images, totalCost }) => {
  const calculateTotalTokens = () => {
    if (!images || images.length === 0) return { input: 0, output: 0, total: 0 };

    const totals = images.reduce(
      (acc, img) => {
        if (img.token_usage) {
          acc.input += img.token_usage.input_tokens || 0;
          acc.output += img.token_usage.output_tokens || 0;
          acc.total += img.token_usage.total_tokens || 0;
        }
        return acc;
      },
      { input: 0, output: 0, total: 0 }
    );

    return totals;
  };

  const calculateTotalCost = () => {
    if (totalCost) return totalCost;

    if (!images || images.length === 0) return 0;

    return images.reduce((sum, img) => {
      return sum + (img.cost_estimate?.total_cost || 0);
    }, 0);
  };

  const tokens = calculateTotalTokens();
  const cost = calculateTotalCost();

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-600" />
        Token Usage & Cost
      </h3>

      <div className="space-y-4">
        {/* Token Usage */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Hash className="w-4 h-4" />
            Token Usage
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">Input Tokens</p>
              <p className="text-lg font-bold text-blue-800">{tokens.input.toLocaleString()}</p>
              <p className="text-xs text-blue-600">
                ${((tokens.input / 1000) * 0.0025).toFixed(4)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs text-purple-600 font-medium">Output Tokens</p>
              <p className="text-lg font-bold text-purple-800">{tokens.output.toLocaleString()}</p>
              <p className="text-xs text-purple-600">
                ${((tokens.output / 1000) * 0.01).toFixed(4)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium">Total Tokens</p>
              <p className="text-lg font-bold text-gray-800">{tokens.total.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Cost Summary
          </h4>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Cost</p>
                <p className="text-2xl font-bold text-green-800">
                  ${cost.toFixed(4)}
                </p>
              </div>
              {images && images.length > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Images Processed</p>
                  <p className="text-lg font-semibold text-gray-800">{images.length}</p>
                  <p className="text-xs text-gray-500">
                    Avg: ${(cost / images.length).toFixed(4)}/image
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Per Image Breakdown */}
        {images && images.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Per Image Breakdown</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {images.map((img, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-1 px-2 text-sm hover:bg-gray-50 rounded"
                >
                  <span className="text-gray-600 truncate flex-1 mr-2">
                    {img.filename || `Image ${index + 1}`}
                  </span>
                  <span className="font-medium text-gray-800">
                    ${(img.cost_estimate?.total_cost || 0).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rate Information */}
        <div className="text-xs text-gray-500 border-t pt-2">
          <p>Rates: Input $0.0025/1K tokens | Output $0.01/1K tokens</p>
        </div>
      </div>
    </div>
  );
};

export default CostTracker;