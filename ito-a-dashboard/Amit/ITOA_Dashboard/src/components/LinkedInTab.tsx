import { useState, useEffect } from 'react';
import { FileText, Eye, Heart, MessageCircle, TrendingUp, Lightbulb, Users, Share2, Sparkles, Loader2 } from 'lucide-react';
import { KPICard } from './KPICard';
import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'motion/react';
import { WordCloud } from './WordCloud';
import { API_URL } from '../config';

interface LinkedInPost {
  post_id: string;
  post_date: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
}

interface LinkedInKPIs {
  totalPosts: number;
  totalImpressions: number;
  avgEngagementRate: number;
  totalReactions: number;
  totalComments: number;
  trends: {
    posts: number;
    impressions: number;
    engagementRate: number;
    reactions: number;
    comments: number;
  };
}

interface EngagementOverTime {
  date: string;
  likes: number;
  comments: number;
  shares: number;
}

interface TopPost {
  post: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
}

interface SentimentData {
  name: string;
  value: number;
  color: string;
}

interface WordCloudItem {
  text: string;
  value: number;
}

interface LinkedInSummaryData {
  kpis: LinkedInKPIs;
  engagementOverTime: EngagementOverTime[];
  topPosts: TopPost[];
  sentimentData: SentimentData[];
  wordCloudData: WordCloudItem[];
  rawPosts: LinkedInPost[];
}

// Custom tooltip for top posts
const PostTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl">
        <p className="text-white mb-2">{data.post}</p>
        <div className="space-y-1 text-sm">
          <p className="text-slate-300">Impressions: <span className="text-purple-400">{data.impressions.toLocaleString()}</span></p>
          <div className="border-t border-slate-700 my-2 pt-2">
            <p className="text-slate-300">Likes: <span className="text-pink-400">{data.likes.toLocaleString()}</span></p>
            <p className="text-slate-300">Comments: <span className="text-blue-400">{data.comments.toLocaleString()}</span></p>
            <p className="text-slate-300">Shares: <span className="text-teal-400">{data.shares.toLocaleString()}</span></p>
          </div>
          <p className="text-slate-400 text-xs mt-2">Engagement Rate: {((data.likes + data.comments + data.shares) / data.impressions * 100).toFixed(2)}%</p>
        </div>
      </div>
    );
  }
  return null;
};

export function LinkedInTab() {
  // State management for API data
  const [summaryData, setSummaryData] = useState<LinkedInSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  // Fetch LinkedIn summary data on component mount
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`${API_URL}/api/linkedin/summary`);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data: LinkedInSummaryData = await response.json();
        setSummaryData(data);
      } catch (e) {
        if (e instanceof Error) {
          setError(`Failed to fetch LinkedIn data: ${e.message}. Please ensure the backend server is running.`);
        } else {
          setError('An unknown error occurred.');
        }
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
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
          Total Impressions: ${summaryData.kpis.totalImpressions}
          Average Engagement Rate: ${summaryData.kpis.avgEngagementRate.toFixed(2)}%
          Total Reactions: ${summaryData.kpis.totalReactions}
          Total Comments: ${summaryData.kpis.totalComments}
          Top Performing Post: ${summaryData.topPosts[0]?.post || 'N/A'}
        `.trim();

        // Get auth token from localStorage
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }

        // Make API request to backend
        const response = await fetch(`${API_URL}/api/recommendations/linkedin`, {
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
    return <div className="text-center text-slate-400 p-8">Loading LinkedIn posts data...</div>;
  }

  // Handle error state
  if (error) {
    return <div className="text-center text-red-500 bg-red-900/20 p-4 rounded-lg">{error}</div>;
  }

  // Handle empty data
  if (!summaryData || !summaryData.kpis || summaryData.kpis.totalPosts === 0) {
    return <div className="text-center text-slate-400 p-8">No LinkedIn posts data available.</div>;
  }

  // Extract pre-calculated data from backend
  const { kpis, engagementOverTime, topPosts, sentimentData, wordCloudData } = summaryData;

  // Calculate positive sentiment percentage from backend data
  const overallSentiment = sentimentData.find(item => item.name === 'Positive')?.value || 0;

  return (
    <div className="space-y-6">
      {/* Data Status Banner */}
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-semibold">LinkedIn Posts Analytics</h2>
            <p className="text-slate-400 text-sm mt-1">
              Successfully loaded <span className="text-teal-400 font-semibold">{kpis.totalPosts}</span> LinkedIn posts from the backend
            </p>
          </div>
          <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-green-400 text-sm font-medium">Live Data</span>
          </div>
        </div>
      </Card>

      {/* KPI Bar - 5 cards with backend-calculated data */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total Posts"
          value={kpis.totalPosts.toString()}
          trend={kpis.trends.posts}
          icon={<FileText className="w-5 h-5" />}
        />
        <KPICard
          title="Total Impressions"
          value={kpis.totalImpressions >= 1000 ? `${(kpis.totalImpressions / 1000).toFixed(1)}K` : kpis.totalImpressions.toString()}
          trend={kpis.trends.impressions}
          icon={<Eye className="w-5 h-5" />}
        />
        <KPICard
          title="Avg Engagement Rate"
          value={kpis.avgEngagementRate.toFixed(2)}
          suffix="%"
          trend={kpis.trends.engagementRate}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          title="Total Reactions"
          value={kpis.totalReactions >= 1000 ? `${(kpis.totalReactions / 1000).toFixed(1)}K` : kpis.totalReactions.toString()}
          trend={kpis.trends.reactions}
          icon={<Heart className="w-5 h-5" />}
        />
        <KPICard
          title="Total Comments"
          value={kpis.totalComments >= 1000 ? `${(kpis.totalComments / 1000).toFixed(1)}K` : kpis.totalComments.toString()}
          trend={kpis.trends.comments}
          icon={<MessageCircle className="w-5 h-5" />}
        />
      </div>

      {/* 2x2 Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top-Left: Engagement Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h3 className="text-white mb-4">Engagement Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    // Convert "2025-08-04/2025-08-10" to "Aug 4-10"
                    const [start, end] = value.split('/');
                    const startDate = new Date(start);
                    const endDate = new Date(end);
                    const month = startDate.toLocaleDateString('en-US', { month: 'short' });
                    const startDay = startDate.getDate();
                    const endDay = endDate.getDate();
                    return `${month} ${startDay}-${endDay}`;
                  }}
                />
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
                  dataKey="likes"
                  stroke="#ec4899"
                  strokeWidth={3}
                  name="Likes"
                  dot={{ fill: '#ec4899', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="comments"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Comments"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="shares"
                  stroke="#14b8a6"
                  strokeWidth={3}
                  name="Shares"
                  dot={{ fill: '#14b8a6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Top-Right: Word Cloud */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h3 className="text-white mb-4">Most Frequent Words in Posts</h3>
            <div className="h-[300px] flex items-center justify-center overflow-hidden">
              <WordCloud words={wordCloudData} />
            </div>
          </Card>
        </motion.div>

        {/* Bottom-Left: Sentiment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-slate-800 border-slate-700 p-6 h-full flex flex-col">
            <h3 className="text-white mb-4">Comment Sentiment Analysis</h3>
            
            {/* Donut Chart */}
            <div className="mb-6 flex-grow flex flex-col justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center sentiment score */}
              <div className="text-center -mt-32 mb-24 relative z-10 pointer-events-none">
                <div className="text-4xl text-white">{overallSentiment}%</div>
                <div className="text-sm text-slate-400">Positive</div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-sm">
                {sentimentData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-300">{item.name}</span>
                    <span className="text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Bottom-Right: Top Performing Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-slate-800 border-slate-700 p-6">
            <h3 className="text-white mb-4">Top 10 Posts by Impressions</h3>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={topPosts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis 
                  dataKey="post" 
                  type="category" 
                  stroke="#94a3b8" 
                  width={160}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<PostTooltip />} cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }} />
                <Bar dataKey="impressions" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>
      {/* AI Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-3">
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
            <div className="grid md:grid-cols-3 gap-4">
              {recommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.1 }}
                >
                  <div className="bg-slate-900/50 rounded-lg p-3 hover:bg-slate-900 transition-all cursor-pointer border border-transparent hover:border-teal-500/30 h-full">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded bg-teal-500/10 text-teal-400 flex-shrink-0">
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <p className="text-slate-300 text-sm flex-1">{rec}</p>
                    </div>
                  </div>
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
      </motion.div>
    </div>
  );
}
