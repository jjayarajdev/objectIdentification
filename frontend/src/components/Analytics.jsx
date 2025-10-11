import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Activity,
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Database,
  X
} from 'lucide-react';
import AnalysisDisplay from './AnalysisDisplay';

const Analytics = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    limit: 50
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch summary
      const summaryRes = await fetch('http://localhost:8000/api/transactions/summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData.summary);

      // Fetch transaction history
      const params = new URLSearchParams({
        limit: filter.limit,
        ...(filter.type && { transaction_type: filter.type }),
        ...(filter.status && { status: filter.status })
      });

      const historyRes = await fetch(`http://localhost:8000/api/transactions/history?${params}`);
      const historyData = await historyRes.json();
      setTransactions(historyData.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDetailsPanel = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsPanel(true);
  };

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setTimeout(() => setSelectedTransaction(null), 300);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const filteredTransactions = transactions.filter(txn => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        txn.endpoint?.toLowerCase().includes(searchLower) ||
        txn.transaction_id?.toLowerCase().includes(searchLower) ||
        txn.ip_address?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const exportToJSON = () => {
    const dataStr = JSON.stringify(filteredTransactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `analytics-${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Transactions</p>
                <p className="text-2xl font-bold">{summary.today_transactions}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Uploads</p>
                <p className="text-2xl font-bold">{summary.total_uploads}</p>
              </div>
              <Database className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Analyses</p>
                <p className="text-2xl font-bold">{summary.total_analyses}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold">{summary.error_rate_percent.toFixed(1)}%</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* API Costs */}
      {summary?.api_costs && Object.keys(summary.api_costs).length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">API Costs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(summary.api_costs).map(([provider, data]) => (
              <div key={provider} className="border rounded-lg p-3">
                <h4 className="font-medium text-gray-700">{provider}</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <p>Total Cost: <span className="font-semibold">${data.total_cost?.toFixed(4) || 0}</span></p>
                  <p>Total Tokens: <span className="font-semibold">{data.total_tokens || 0}</span></p>
                  <p>Total Calls: <span className="font-semibold">{data.call_count || 0}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filter.status}
            onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="processing">Processing</option>
          </select>

          <select
            value={filter.limit}
            onChange={(e) => setFilter(prev => ({ ...prev, limit: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="25">25 rows</option>
            <option value="50">50 rows</option>
            <option value="100">100 rows</option>
            <option value="500">500 rows</option>
          </select>

          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button
            onClick={exportToJSON}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-lg font-semibold">Transaction History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((txn) => (
                <React.Fragment key={txn.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusIcon(txn.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getMethodColor(txn.method)}`}>
                        {txn.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {txn.endpoint}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {txn.duration_ms ? `${txn.duration_ms}ms` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(txn.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openDetailsPanel(txn)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found
            </div>
          )}
        </div>
      </div>

      {/* Details Slider Panel */}
      {showDetailsPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={closeDetailsPanel}
          />

          {/* Sliding Panel */}
          <div className={`fixed right-0 top-0 h-full bg-white shadow-xl z-50 transition-transform duration-300 ${showDetailsPanel ? 'translate-x-0' : 'translate-x-full'}`}
               style={{ width: '60%', maxWidth: '800px' }}>

            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Transaction Details</h2>
                {selectedTransaction && (
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedTransaction.method} {selectedTransaction.endpoint}
                  </p>
                )}
              </div>
              <button
                onClick={closeDetailsPanel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Content */}
            {selectedTransaction && (
              <div className="overflow-y-auto h-full pb-20">
                <div className="p-6 space-y-6">
                  {/* Transaction Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Transaction Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Transaction ID</p>
                        <p className="text-sm text-gray-900 font-mono mt-1">{selectedTransaction.transaction_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(selectedTransaction.status)}
                          <span className="text-sm capitalize">{selectedTransaction.status}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Duration</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedTransaction.duration_ms ? `${selectedTransaction.duration_ms}ms` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">IP Address</p>
                        <p className="text-sm text-gray-900 mt-1">{selectedTransaction.ip_address || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Timestamp</p>
                        <p className="text-sm text-gray-900 mt-1">{formatDate(selectedTransaction.timestamp)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Method</p>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium mt-1 ${getMethodColor(selectedTransaction.method)}`}>
                          {selectedTransaction.method}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Request Data */}
                  {selectedTransaction.request_data && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Request Data</h3>
                      <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(selectedTransaction.request_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Response Data */}
                  {selectedTransaction.response_data && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Response Data</h3>
                      {selectedTransaction.endpoint === '/api/room-analysis/analyze' && selectedTransaction.response_data.analysis ? (
                        <div className="bg-white rounded-lg border">
                          <AnalysisDisplay analysis={selectedTransaction.response_data.analysis} />
                        </div>
                      ) : (
                        <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(selectedTransaction.response_data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {selectedTransaction.error_message && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <h3 className="font-medium text-red-900 mb-2">Error Details</h3>
                      <p className="text-sm text-red-700">{selectedTransaction.error_message}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;