import { useState, useEffect } from 'react';
import { BookOpen, Clock, Lightbulb, TrendingUp, Users, FileEdit, Target, Sparkles, Loader2 } from 'lucide-react';
import { KPICard } from './KPICard';
import { Card } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion } from 'motion/react';
import { API_URL } from '../config';

// TypeScript interface for blog post data
interface BlogPost {
  blog_id: string;
  publish_date: string;
  title: string;
  author: string;
  views: number;
  comments: number;
  shares: number;
  clicks: number;
}

interface BlogKPIs {
  totalPosts: number;
  totalViews: number;
  avgViewsPerPost: number;
  totalComments: number;
  totalShares: number;
  totalClicks: number;
  trends: {
    views: number;
    avgViews: number;
    comments: number;
    shares: number;
  };
}

interface ViewsOverTime {
  month: string;
  views: number;
}

interface TopArticle {
  title: string;
  views: number;
  comments: number;
  shares: number;
  clicks: number;
}

interface BlogSummaryData {
  kpis: BlogKPIs;
  viewsOverTime: ViewsOverTime[];
  topArticles: TopArticle[];
  rawPosts: BlogPost[];
}

export function BlogTab() {
  // State management for API data
  const [summaryData, setSummaryData] = useState<BlogSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  // Fetch blog summary data on component mount
  useEffect(() => {
    const fetchBlogSummary = async () => {
      try {
        const response = await fetch(`${API_URL}/api/blog/summary`);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data: BlogSummaryData = await response.json();
        setSummaryData(data);
        console.log('Blog summary fetched successfully:', data);
      } catch (e) {
        if (e instanceof Error) {
          setError(`Failed to fetch blog data: ${e.message}. Please ensure the backend server is running.`);
        } else {
          setError('An unknown error occurred.');
        }
        console.error('Error fetching blog summary:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogSummary();
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
          Total Posts: ${summaryData.kpis.totalPosts}
          Total Views: ${summaryData.kpis.totalViews}
          Average Views per Post: ${summaryData.kpis.avgViewsPerPost.toFixed(0)}
          Total Comments: ${summaryData.kpis.totalComments}
          Total Shares: ${summaryData.kpis.totalShares}
          Top Article: ${summaryData.topArticles[0]?.title || 'N/A'} (${summaryData.topArticles[0]?.views || 0} views)
        `.trim();

        // Get auth token from localStorage
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }

        // Make API request to backend
        const response = await fetch(`${API_URL}/api/recommendations/blog`, {
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
    return <div className="text-center text-slate-400 p-8">Loading blog posts data...</div>;
  }

  // Handle error state
  if (error) {
    return <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</div>;
  }

  // Handle empty data
  if (!summaryData || !summaryData.kpis || summaryData.kpis.totalPosts === 0) {
    return <div className="text-center text-slate-400 p-8">No blog posts data available.</div>;
  }

  // Extract pre-calculated data from backend
  const { kpis, viewsOverTime, topArticles } = summaryData;

  // Take only top 5 articles for the chart
  const top5Articles = topArticles.slice(0, 5);

  // Format total views for display (e.g., 126349 -> "126.3K")
  const formatViews = (views: number): string => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  return (
    <div className="space-y-6">
      {/* Data Status Banner */}
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-semibold">Blog Posts Analytics</h2>
            <p className="text-slate-400 text-sm mt-1">
              Successfully loaded <span className="text-teal-400 font-semibold">{kpis.totalPosts}</span> blog posts from the backend
            </p>
          </div>
          <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-green-400 text-sm font-medium">Live Data</span>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <KPICard
          title="Total Blog Views"
          value={formatViews(kpis.totalViews)}
          trend={kpis.trends.views}
          icon={<BookOpen className="w-5 h-5" />}
        />
        <KPICard
          title="Avg Views per Post"
          value={Math.round(kpis.avgViewsPerPost).toString()}
          suffix="views"
          trend={kpis.trends.avgViews}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Views Over Time */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <h3 className="text-white mb-4">Blog Views Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={viewsOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ fill: '#22c55e', r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Top Articles */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <h3 className="text-white mb-4">Top 5 Articles by Views</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top5Articles} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="title" type="category" stroke="#94a3b8" width={200} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey="views" fill="#22c55e" radius={[0, 4, 4, 0]} />
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
