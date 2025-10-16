import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, Clock, Trash2, Activity } from 'lucide-react';

const MonitorCard = ({ monitor, metric, onDelete }) => {
  const history = metric?.history || [];
  
  const currentStatus = monitor.current_status || 'unknown';

  const getStatusColor = (status) => {
    switch (status) {
      case 'up': return 'text-green-600';        // Changed from 'active' to 'up'
      case 'down': return 'text-red-600';
      case 'unknown': return 'text-yellow-600';  // Changed from 'warning' to 'unknown'
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
     switch (status) {
      case 'up': return <CheckCircle className="w-5 h-5" />;     // Changed from 'active' to 'up'
      case 'down': return <AlertCircle className="w-5 h-5" />;
      case 'unknown': return <Clock className="w-5 h-5" />;      // Added 'unknown' case
      default: return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* 🔥 CRITICAL: Use currentStatus instead of monitor.status */}
          <div className={getStatusColor(currentStatus)}>
            {getStatusIcon(currentStatus)}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{monitor.name}</h3>
            <p className="text-gray-600 text-sm">{monitor.url}</p>
            {/* Optional: Show both statuses for debugging */}
            <p className="text-xs text-gray-400">
              Service: {currentStatus} | Monitor: {monitor.status}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDelete(monitor.id)}
          className="text-red-500 hover:text-red-700 p-1 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

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

      {history.length > 0 ? (
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
      ) : (
        <div className="h-48 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Waiting for monitoring data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitorCard;