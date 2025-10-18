import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, Clock, Plus, Trash2, Activity } from 'lucide-react';

const MonitoringDashboard = () => {
  const [monitors, setMonitors] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [newMonitor, setNewMonitor] = useState({ name: '', url: '', interval: 60 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isLoading, setIsLoading] = useState(false);

  // Use environment variables for API URLs, fallback to localhost for development
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api/v1";
  const WS_BASE_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8080/ws";

  // WebSocket connection
  useEffect(() => {
    let reconnectTimeout;

    const connectWebSocket = () => {
      try {
        const websocket = new WebSocket(WS_BASE_URL);

        websocket.onopen = () => {
          setConnectionStatus('Connected');
          console.log('WebSocket connected');
          // Clear any reconnection timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
        };

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'metric_update') {
              const metric = data.data;
              setMetrics(prev => ({
                ...prev,
                [metric.monitor_id]: {
                  ...prev[metric.monitor_id],
                  latest: metric,
                  history: [...(prev[metric.monitor_id]?.history || []).slice(-19), {
                    time: new Date(metric.timestamp).toLocaleTimeString(),
                    response_time: metric.response_time,
                    status: metric.status_code
                  }]
                }
              }));
            } else if (data.type === 'monitor_status') {
              const status = data.data;
              setMonitors(prev => prev.map(monitor =>
                monitor.id === status.monitor_id
                  ? { ...monitor, status: status.status }
                  : monitor
              ));
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        };

        websocket.onclose = (event) => {
          setConnectionStatus('Disconnected');
          console.log('WebSocket disconnected:', event.code, event.reason);

          // Attempt to reconnect after 3 seconds if not a clean close
          if (event.code !== 1000) {
            reconnectTimeout = setTimeout(() => {
              console.log('Attempting to reconnect WebSocket...');
              connectWebSocket();
            }, 3000);
          }
        };

        websocket.onerror = (error) => {
          setConnectionStatus('Error');
          console.error('WebSocket error:', error);
        };

        setWs(websocket);

        return websocket;
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setConnectionStatus('Error');

        // Retry connection after 5 seconds
        reconnectTimeout = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      }
    };

    const websocket = connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (websocket) {
        websocket.close(1000, 'Component unmounting');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch monitors
  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  const fetchMonitors = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/monitors`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched monitors:', data);

      // Handle both possible response formats with better validation
      const monitorsArray = data.data || data || [];

      // Ensure we always set an array
      if (Array.isArray(monitorsArray)) {
        setMonitors(monitorsArray);
      } else {
        console.warn('API returned non-array data:', monitorsArray);
        setMonitors([]);
      }
    } catch (error) {
      console.error("Fetch monitors failed:", error);
      setMonitors([]); // Always ensure it's an array
    } finally {
      setIsLoading(false);
    }
  };


  const addMonitor = async () => {
    if (!newMonitor.name || !newMonitor.url) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/monitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMonitor.name,
          url: newMonitor.url,
          interval: parseInt(newMonitor.interval)
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }

      const result = await response.json();
      console.log('Monitor added:', result);

      setNewMonitor({ name: '', url: '', interval: 60 });
      setShowAddForm(false);
      await fetchMonitors(); // Refresh the list

    } catch (error) {
      console.error('Error adding monitor:', error);
      alert(`Failed to add monitor: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMonitor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this monitor?')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/monitors/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Monitor deleted:', id);
      await fetchMonitors(); // Refresh the list

      // Clean up metrics for deleted monitor
      setMetrics(prev => {
        const newMetrics = { ...prev };
        delete newMetrics[id];
        return newMetrics;
      });

    } catch (error) {
      console.error('Error deleting monitor:', error);
      alert(`Failed to delete monitor: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5" />;
      case 'down': return <AlertCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-8 h-8 text-blue-600" />
                Real-time Monitoring Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Monitor your APIs and services in real-time</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${connectionStatus === 'Connected'
                ? 'bg-green-100 text-green-700'
                : connectionStatus === 'Connecting...'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
                }`}>
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'Connected'
                  ? 'bg-green-500 animate-pulse'
                  : connectionStatus === 'Connecting...'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                  }`} />
                {connectionStatus}
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Monitor
              </button>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Loading...
            </div>
          </div>
        )}

        {/* Add Monitor Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Add New Monitor</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monitor Name *
                  </label>
                  <input
                    type="text"
                    value={newMonitor.name}
                    onChange={(e) => setNewMonitor({ ...newMonitor, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., My API"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL to Monitor *
                  </label>
                  <input
                    type="url"
                    value={newMonitor.url}
                    onChange={(e) => setNewMonitor({ ...newMonitor, url: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://api.example.com/health"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={newMonitor.interval}
                    onChange={(e) => setNewMonitor({ ...newMonitor, interval: parseInt(e.target.value) || 60 })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="30"
                    max="3600"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={addMonitor}
                  disabled={isLoading || !newMonitor.name || !newMonitor.url}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Adding...' : 'Add Monitor'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  disabled={isLoading}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Monitors</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Array.isArray(monitors) ? monitors.length : 0}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Monitors</p>
                <p className="text-2xl font-semibold text-green-600">
                  {Array.isArray(monitors) ? monitors.filter(m => m.current_status === 'up').length : 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Down Monitors</p>
                <p className="text-2xl font-semibold text-red-600">
                  {Array.isArray(monitors) ? monitors.filter(m => m.current_status === 'down').length : 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg Response Time</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {Object.values(metrics).length > 0
                    ? Math.round(Object.values(metrics).reduce((sum, m) => sum + (m.latest?.response_time || 0), 0) / Object.values(metrics).length)
                    : 0}ms
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>


        {/* Monitors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {monitors.map((monitor) => {
            const metric = metrics[monitor.id];
            const history = metric?.history || [];

            return (
              <div key={monitor.id} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={getStatusColor(monitor.status)}>
                      {getStatusIcon(monitor.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{monitor.name}</h3>
                      <p className="text-gray-600 text-sm break-all">{monitor.url}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMonitor(monitor.id)}
                    disabled={isLoading}
                    className="text-red-500 hover:text-red-700 p-1 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Current Status */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      {metric?.latest?.status_code || '--'}
                    </p>
                    <p className="text-sm text-gray-600">Status Code</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-blue-600">
                      {metric?.latest?.response_time || '--'}ms
                    </p>
                    <p className="text-sm text-gray-600">Response Time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-green-600">
                      {monitor.interval}s
                    </p>
                    <p className="text-sm text-gray-600">Check Interval</p>
                  </div>
                </div>

                {/* Response Time Chart */}
                {history.length > 0 && (
                  <div className="h-48">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Response Time Trend</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="response_time"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {history.length === 0 && (
                  <div className="h-48 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Waiting for monitoring data...</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {monitors.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Monitors Yet</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first monitor to track your APIs and services.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Monitor
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringDashboard;