import React, { useState } from 'react';
import { BarChart3, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Violation } from '../types/violation';

interface DashboardProps {
  violations: Violation[];
}

export default function Dashboard({ violations }: DashboardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const stats = {
    total: violations.length,
    pending: violations.filter(v => v.status === 'Pending').length,
    inProgress: violations.filter(v => v.status === 'In Progress').length,
    resolved: violations.filter(v => v.status === 'Resolved').length,
    highPriority: violations.filter(v => v.priority === 'High').length,
  };

  const StatCard = ({ title, value, icon: Icon, color, bgColor }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
  }) => (
    <div className={`${bgColor} rounded-lg p-6 shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
    </div>
  );

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Dashboard Overview</h2>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={isCollapsed ? "Expand dashboard" : "Collapse dashboard"}
        >
          <span className="text-sm font-medium">
            {isCollapsed ? 'Show' : 'Hide'} Stats
          </span>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total Violations"
            value={stats.total}
            icon={BarChart3}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            color="text-yellow-600"
            bgColor="bg-yellow-50"
          />
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={AlertTriangle}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <StatCard
            title="Resolved"
            value={stats.resolved}
            icon={CheckCircle}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            title="High Priority"
            value={stats.highPriority}
            icon={AlertTriangle}
            color="text-red-600"
            bgColor="bg-red-50"
          />
        </div>
      )}
    </div>
  );
}