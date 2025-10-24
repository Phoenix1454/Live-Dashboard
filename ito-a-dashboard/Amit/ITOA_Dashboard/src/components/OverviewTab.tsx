import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Heart, MousePointer, Target, AlertCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../config';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface KPIs {
  totalUniqueVisitors: number;
  totalSocialEngagement: number;
  totalEmailClicks: number;
  totalSeoClicks: number;
}

interface FunnelStage {
  stage: string;
  value: number;
  color: string;
  description: string;
}

interface SourceMixItem {
  name: string;
  value: number;
  color: string;
}

interface FeatureImportance {
  feature: string;
  importance: number;
}

interface OverviewData {
  kpis: KPIs;
  funnelData: FunnelStage[];
  sourceMixData: SourceMixItem[];
  featureImportances: FeatureImportance[];
  totalDataPoints: number;
}

// ============================================================================
// Main Component
// ============================================================================

export function OverviewTab() {
  // State management
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/api/overview`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: OverviewData = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching overview data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch overview data');
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  // ============================================================================
  // Loading State
  // ============================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading overview data...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="bg-slate-800 border-slate-700 p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
            <p className="text-slate-400 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Empty State
  // ============================================================================
  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="bg-slate-800 border-slate-700 p-8">
          <p className="text-slate-400">No overview data available</p>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Helper Functions
  // ============================================================================
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Convert feature importances to percentage for display
  const featureImportancesPercent = data.featureImportances.map(item => ({
    ...item,
    importancePercent: (item.importance * 100).toFixed(1)
  }));

  const totalTraffic = data.sourceMixData.reduce((sum, item) => sum + item.value, 0);

  // Calculate conversion percentages for funnel
  const maxFunnelValue = Math.max(...data.funnelData.map(d => d.value));

  // ============================================================================
  // Render Component
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* KPI Bar - Full Width */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Visitors */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Total Visitors</p>
            <Users className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-white">{formatNumber(data.kpis.totalUniqueVisitors)}</p>
        </Card>

        {/* Total Engagement */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Total Engagement</p>
            <Heart className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-white">{formatNumber(data.kpis.totalSocialEngagement)}</p>
        </Card>

        {/* Email Clicks */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Email Clicks</p>
            <MousePointer className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-white">{formatNumber(data.kpis.totalEmailClicks)}</p>
        </Card>

        {/* SEO Clicks */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">SEO Clicks</p>
            <Target className="h-5 w-5 text-teal-500" />
          </div>
          <p className="text-3xl font-bold text-white">{formatNumber(data.kpis.totalSeoClicks)}</p>
        </Card>
      </div>

      {/* 2x2 Grid Layout for Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top-Left: Marketing Funnel */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h3 className="text-white text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-500" />
            Marketing Funnel
          </h3>
          <div className="space-y-4">
            {data.funnelData.map((stage, index) => {
              const percentage = (stage.value / maxFunnelValue) * 100;
              const conversionRate = index === 0 
                ? 100 
                : ((stage.value / data.funnelData[0].value) * 100).toFixed(1);
              
              return (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">{stage.stage}</span>
                    <span className="text-sm font-semibold text-white">{formatNumber(stage.value)}</span>
                  </div>
                  <div className="relative h-12 bg-slate-900/50 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 flex items-center justify-center transition-all duration-500 rounded-lg"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: stage.color,
                        opacity: 1 - (index * 0.05),
                      }}
                    >
                      {percentage > 15 && (
                        <span className="text-white dark:text-white text-xs font-semibold">
                          {conversionRate}%
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{stage.description}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top-Right: Traffic Driver Mix */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Traffic Driver Mix
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.sourceMixData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.sourceMixData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [
                  `${formatNumber(value)} (${((value / totalTraffic) * 100).toFixed(1)}%)`,
                  ''
                ]}
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            {data.sourceMixData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-slate-300">{item.name}</span>
                <span className="text-sm text-slate-400">
                  {((item.value / totalTraffic) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bottom-Left: Key Drivers (Feature Importances) */}
        <Card className="bg-slate-800 border-slate-700 p-6 lg:col-span-2">
          <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
            </svg>
            What Drives Future Visitors?
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureImportancesPercent} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                type="number" 
                domain={[0, 100]}
                label={{ value: 'Importance (%)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis 
                dataKey="feature" 
                type="category" 
                width={150}
                stroke="#94a3b8"
                tick={{ fill: '#fff' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, 'Importance']}
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar 
                dataKey="importancePercent" 
                fill="#a855f7" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 mt-4 text-center">
            ML-powered analysis showing which metrics most strongly predict unique visitor growth
          </p>
        </Card>
      </div>
    </div>
  );
}
