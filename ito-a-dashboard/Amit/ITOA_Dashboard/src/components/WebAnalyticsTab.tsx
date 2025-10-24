import { useState, useEffect } from 'react';
import { Globe, MousePointer, Clock, FileText, Lightbulb, Zap, TrendingUp, Target, Users, Sparkles, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'motion/react';
import { API_URL } from '../config';

// TypeScript interface for web analytics data
interface WebAnalyticsData {
  date: string;
  page_views: number;
  unique_visitors: number;
  bounce_rate: number;
  avg_session_duration: number;
}

interface WebKPIs {
  totalPageViews: number;
  totalUniqueVisitors: number;
  averageBounceRate: number;
  averageSessionDuration: number;
  formattedSessionDuration: string;
  pagesPerSession: number;
  trends: {
    pageViews: number;
    bounceRate: number;
    sessionDuration: number;
    pagesPerSession: number;
  };
}

interface WebSummaryData {
  kpis: WebKPIs;
  rawAnalytics: WebAnalyticsData[];
}

export function WebAnalyticsTab() {
  // State management for API data
  const [summaryData, setSummaryData] = useState<WebSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  // Fetch web analytics summary data on component mount
  useEffect(() => {
    const fetchWebSummary = async () => {
      try {
        const response = await fetch(`${API_URL}/api/web/summary`);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data: WebSummaryData = await response.json();
        setSummaryData(data);
        console.log('Web analytics summary fetched successfully:', data);
      } catch (e) {
        if (e instanceof Error) {
          setError(`Failed to fetch web analytics data: ${e.message}. Please ensure the backend server is running.`);
        } else {
          setError('An unknown error occurred.');
        }
        console.error('Error fetching web analytics summary:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchWebSummary();
  }, []);

  // Fetch AI recommendations when summary data is available
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!summaryData || !summaryData.kpis) return;

      setRecommendationsLoading(true);
      setRecommendationsError(null);

      try {
        // Build data summary from KPIs
        const dataSummary = `
          Total Page Views: ${summaryData.kpis.totalPageViews}
          Total Unique Visitors: ${summaryData.kpis.totalUniqueVisitors}
          Average Bounce Rate: ${summaryData.kpis.averageBounceRate}%
          Average Session Duration: ${summaryData.kpis.formattedSessionDuration}
          Pages Per Session: ${summaryData.kpis.pagesPerSession}
          Total Days Tracked: ${summaryData.rawAnalytics.length}
        `.trim();

        // Get auth token from localStorage
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }

        // Make API request to backend
        const response = await fetch(`${API_URL}/api/recommendations/web`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ data_summary: dataSummary }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success && data.recommendations) {
          setRecommendations(data.recommendations);
        } else {
          throw new Error(data.message || 'Failed to generate recommendations');
        }
      } catch (err) {
        console.error('Error fetching AI recommendations:', err);
        setRecommendationsError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setRecommendationsLoading(false);
      }
    };

    fetchRecommendations();
  }, [summaryData]);

  // Handle loading state
  if (loading) {
    return <div className="text-center text-slate-400 p-8">Loading web analytics data...</div>;
  }

  // Handle error state
  if (error) {
    return <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>;
  }

  // Handle empty data
  if (!summaryData || !summaryData.kpis || summaryData.kpis.totalPageViews === 0) {
    return <div className="text-center text-slate-400 p-8">No web analytics data available.</div>;
  }

  // Extract pre-calculated data from backend
  const { kpis } = summaryData;

  // Format total page views for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Process data for "Key Web Metrics Over Time" chart
  // Aggregate by week to reduce data points (365 days -> ~52 weeks)
  const getWeekKey = (dateStr: string): string => {
    const date = new Date(dateStr);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Set to Sunday of that week
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;
  };

  const metricsByWeek = summaryData.rawAnalytics.reduce((acc, record) => {
    const weekKey = getWeekKey(record.date);
    const existingWeek = acc.find((item) => item.week === weekKey);
    
    if (existingWeek) {
      existingWeek.page_views += record.page_views;
      existingWeek.unique_visitors += record.unique_visitors;
      existingWeek.count += 1;
    } else {
      acc.push({ 
        week: weekKey, 
        page_views: record.page_views, 
        unique_visitors: record.unique_visitors,
        count: 1,
        date: record.date 
      });
    }
    return acc;
  }, [] as { week: string; page_views: number; unique_visitors: number; count: number; date: string }[]);

  // Sort by date and take last 12 weeks
  const metricsOverTime = metricsByWeek
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12)
    .map(({ week, page_views, unique_visitors }) => ({ 
      week, 
      pageViews: page_views, 
      uniqueVisitors: unique_visitors 
    }));

  // Process data for "Daily Bounce Rate Distribution" chart
  // Create histogram buckets for bounce rates
  const bounceRateBuckets = [
    { range: '0-10%', min: 0, max: 0.1, count: 0 },
    { range: '10-20%', min: 0.1, max: 0.2, count: 0 },
    { range: '20-30%', min: 0.2, max: 0.3, count: 0 },
    { range: '30-40%', min: 0.3, max: 0.4, count: 0 },
    { range: '40-50%', min: 0.4, max: 0.5, count: 0 },
    { range: '50-60%', min: 0.5, max: 0.6, count: 0 },
    { range: '60-70%', min: 0.6, max: 0.7, count: 0 },
    { range: '70-80%', min: 0.7, max: 0.8, count: 0 },
    { range: '80-90%', min: 0.8, max: 0.9, count: 0 },
    { range: '90-100%', min: 0.9, max: 1.0, count: 0 },
  ];

  summaryData.rawAnalytics.forEach(record => {
    const bounceRate = record.bounce_rate;
    const bucket = bounceRateBuckets.find(b => bounceRate >= b.min && bounceRate < b.max);
    if (bucket) {
      bucket.count += 1;
    } else if (bounceRate === 1.0) {
      // Handle edge case where bounce_rate is exactly 1.0
      bounceRateBuckets[bounceRateBuckets.length - 1].count += 1;
    }
  });

  const bounceRateDistribution = bounceRateBuckets.map(({ range, count }) => ({ range, days: count }));

  return (
    <div className="space-y-6">
      {/* Data Status Banner */}
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-semibold">Web Analytics Dashboard</h2>
            <p className="text-slate-400 text-sm mt-1">
              Successfully loaded <span className="text-teal-400 font-semibold">{summaryData.rawAnalytics.length}</span> days of web analytics data from the backend
            </p>
          </div>
          <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-green-400 text-sm font-medium">Live Data</span>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-400 text-sm">Total Page Views</h4>
            <Globe className="w-5 h-5 text-teal-400" />
          </div>
          <p className="text-white text-2xl font-semibold">{formatNumber(kpis.totalPageViews)}</p>
          <p className={`text-sm mt-2 ${kpis.trends.pageViews >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {kpis.trends.pageViews >= 0 ? '+' : ''}{kpis.trends.pageViews.toFixed(1)}%
          </p>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-400 text-sm">Average Bounce Rate</h4>
            <MousePointer className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-white text-2xl font-semibold">{kpis.averageBounceRate}%</p>
          <p className={`text-sm mt-2 ${kpis.trends.bounceRate >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {kpis.trends.bounceRate >= 0 ? '+' : ''}{kpis.trends.bounceRate.toFixed(1)}%
          </p>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-400 text-sm">Avg. Session Duration</h4>
            <Clock className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-white text-2xl font-semibold">{kpis.formattedSessionDuration}</p>
          <p className={`text-sm mt-2 ${kpis.trends.sessionDuration >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {kpis.trends.sessionDuration >= 0 ? '+' : ''}{kpis.trends.sessionDuration.toFixed(1)}%
          </p>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-400 text-sm">Pages per Session</h4>
            <FileText className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-white text-2xl font-semibold">{kpis.pagesPerSession}</p>
          <p className={`text-sm mt-2 ${kpis.trends.pagesPerSession >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {kpis.trends.pagesPerSession >= 0 ? '+' : ''}{kpis.trends.pagesPerSession.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Key Web Metrics Over Time */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <h3 className="text-white mb-4">Key Web Metrics Over Time (Last 12 Weeks)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={metricsOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="week" 
              stroke="#94a3b8"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelFormatter={(value) => `Week of ${value}`}
            />
            <Line
              type="monotone"
              dataKey="pageViews"
              stroke="#14b8a6"
              strokeWidth={3}
              dot={{ fill: '#14b8a6', r: 4 }}
              activeDot={{ r: 6 }}
              name="Page Views"
            />
            <Line
              type="monotone"
              dataKey="uniqueVisitors"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ fill: '#a855f7', r: 4 }}
              activeDot={{ r: 6 }}
              name="Unique Visitors"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Daily Bounce Rate Distribution */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <h3 className="text-white mb-4">Daily Bounce Rate Distribution</h3>
        <p className="text-slate-400 text-sm mb-4">Number of days in each bounce rate range</p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={bounceRateDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="range" 
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              stroke="#94a3b8"
              label={{ value: 'Number of Days', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number) => [`${value} days`, 'Frequency']}
            />
            <Bar 
              dataKey="days" 
              fill="#22c55e" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* AI-Powered Recommendations */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h3 className="text-white">AI-Powered Recommendations</h3>
        </div>

        {/* Loading State */}
        {recommendationsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-teal-400 animate-spin mr-2" />
            <span className="text-slate-400">Generating AI recommendations...</span>
          </div>
        )}

        {/* Error State */}
        {recommendationsError && !recommendationsLoading && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">{recommendationsError}</p>
          </div>
        )}

        {/* Success State - Show Recommendations */}
        {!recommendationsLoading && !recommendationsError && recommendations.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="bg-slate-900/50 border-slate-700 p-4 hover:bg-slate-900 transition-all hover:border-teal-500/50 cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <p className="text-slate-300 text-sm flex-1">{rec}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!recommendationsLoading && !recommendationsError && recommendations.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            No recommendations available at this time.
          </div>
        )}
      </Card>
    </div>
  );
}
