import { useState, useEffect } from 'react';
import { Search, TrendingUp, Lightbulb, Target, FileText, Link2, Zap, Sparkles, Loader2 } from 'lucide-react';
import { KPICard } from './KPICard';
import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'motion/react';
import { API_URL } from '../config';

// TypeScript interface for SEO metrics data
interface SEOMetric {
  date: string;
  keyword: string;
  rank: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

interface SEOKPIs {
  totalClicks: number;
  averagePosition: number;
  totalImpressions: number;
  averageCTR: number;
  keywordsRanked: number;
  trends: {
    clicks: number;
    position: number;
    impressions: number;
    ctr: number;
  };
}

interface SEOSummaryData {
  kpis: SEOKPIs;
  rawMetrics: SEOMetric[];
}

export function SEOTab() {
  // State management for API data
  const [summaryData, setSummaryData] = useState<SEOSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  // Fetch SEO summary data on component mount
  useEffect(() => {
    const fetchSEOSummary = async () => {
      try {
        const response = await fetch(`${API_URL}/api/seo/summary`);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data: SEOSummaryData = await response.json();
        setSummaryData(data);
        console.log('SEO summary fetched successfully:', data);
      } catch (e) {
        if (e instanceof Error) {
          setError(`Failed to fetch SEO data: ${e.message}. Please ensure the backend server is running.`);
        } else {
          setError('An unknown error occurred.');
        }
        console.error('Error fetching SEO summary:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSEOSummary();
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
          Total SEO Clicks: ${summaryData.kpis.totalClicks}
          Average Position: ${summaryData.kpis.averagePosition.toFixed(1)}
          Total Impressions: ${summaryData.kpis.totalImpressions}
          Average CTR: ${summaryData.kpis.averageCTR.toFixed(2)}%
          Keywords Ranked: ${summaryData.kpis.keywordsRanked}
          Total Records: ${summaryData.rawMetrics.length}
        `.trim();

        // Get auth token from localStorage
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }

        // Make API request to backend
        const response = await fetch(`${API_URL}/api/recommendations/seo`, {
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
    return <div className="text-center text-slate-400 p-8">Loading SEO metrics data...</div>;
  }

  // Handle error state
  if (error) {
    return <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>;
  }

  // Handle empty data
  if (!summaryData || !summaryData.kpis || summaryData.kpis.totalClicks === 0) {
    return <div className="text-center text-slate-400 p-8">No SEO metrics data available.</div>;
  }

  // Extract pre-calculated data from backend
  const { kpis } = summaryData;

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Helper function to get week number from date
  const getWeekKey = (dateStr: string): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Get the week number (simplified - group by start of week)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Set to Sunday of that week
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;
  };

  // Process data for "Clicks Over Time" chart - aggregate by week for better visualization
  const clicksByWeek = summaryData.rawMetrics.reduce((acc, metric) => {
    const weekKey = getWeekKey(metric.date);
    const existingWeek = acc.find((item) => item.week === weekKey);
    
    if (existingWeek) {
      existingWeek.clicks += metric.clicks;
    } else {
      acc.push({ week: weekKey, clicks: metric.clicks, date: metric.date });
    }
    return acc;
  }, [] as { week: string; clicks: number; date: string }[]);

  // Sort by date and limit to last 12 weeks for clarity
  const clicksOverTime = clicksByWeek
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12)
    .map(({ week, clicks }) => ({ week, clicks }));

  // Process data for "Top Keywords by Clicks" chart - group by keyword, sum clicks, and sort
  const topKeywords = summaryData.rawMetrics
    .reduce((acc, metric) => {
      const existingKeyword = acc.find((item) => item.keyword === metric.keyword);
      if (existingKeyword) {
        existingKeyword.clicks += metric.clicks;
      } else {
        acc.push({ keyword: metric.keyword, clicks: metric.clicks });
      }
      return acc;
    }, [] as { keyword: string; clicks: number }[])
    .sort((a, b) => b.clicks - a.clicks); // Sort descending by clicks

  return (
    <div className="space-y-6">
      {/* Data Status Banner */}
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-semibold">SEO Metrics Analytics</h2>
            <p className="text-slate-400 text-sm mt-1">
              Successfully loaded <span className="text-teal-400 font-semibold">{summaryData.rawMetrics.length}</span> SEO metric records from the backend
            </p>
          </div>
          <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-green-400 text-sm font-medium">Live Data</span>
          </div>
        </div>
      </Card>

      {/* KPI Cards - 5 cards in responsive grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total SEO Clicks"
          value={formatNumber(kpis.totalClicks)}
          trend={kpis.trends.clicks}
          icon={<Search className="w-5 h-5" />}
        />
        <KPICard
          title="Avg. Position"
          value={kpis.averagePosition.toFixed(1)}
          trend={kpis.trends.position}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-400 text-sm">Total Impressions</h4>
          </div>
          <p className="text-white text-2xl font-semibold">{formatNumber(kpis.totalImpressions)}</p>
          <p className={`text-sm mt-2 ${kpis.trends.impressions >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {kpis.trends.impressions >= 0 ? '+' : ''}{kpis.trends.impressions.toFixed(1)}%
          </p>
        </Card>
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-400 text-sm">Avg. CTR</h4>
          </div>
          <p className="text-white text-2xl font-semibold">{kpis.averageCTR.toFixed(2)}%</p>
          <p className={`text-sm mt-2 ${kpis.trends.ctr >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {kpis.trends.ctr >= 0 ? '+' : ''}{kpis.trends.ctr.toFixed(1)}%
          </p>
        </Card>
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-slate-400 text-sm">Keywords Ranked</h4>
          </div>
          <p className="text-white text-2xl font-semibold">{kpis.keywordsRanked}</p>
        </Card>
      </div>

      {/* Clicks Over Time */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <h3 className="text-white mb-4">SEO Clicks Over Time (Last 12 Weeks)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={clicksOverTime}>
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
              dataKey="clicks"
              stroke="#14b8a6"
              strokeWidth={3}
              dot={{ fill: '#14b8a6', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Top Keywords */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <h3 className="text-white mb-4">Top Keywords by Clicks</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topKeywords} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="keyword" type="category" stroke="#94a3b8" width={180} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey="clicks" fill="#14b8a6" radius={[0, 4, 4, 0]} />
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
