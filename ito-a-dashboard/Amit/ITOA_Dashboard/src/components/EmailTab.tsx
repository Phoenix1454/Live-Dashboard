import { useState, useEffect } from 'react';
import { Mail, MousePointer, UserMinus, TrendingUp, Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { KPICard } from './KPICard';
import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'motion/react';
import { API_URL } from '../config';

// 1. Define TypeScript interfaces for the API response
interface Campaign {
  campaign_id: string;
  send_date: string;
  subject_line: string;
  recipients: number;
  list_size: number;
  list_growth: number;
  sends: number;
  opens: number;
  clicks: number;
  unsubscribe: number;
  open_rate: number;
  click_through_rate: number;
  CTOR: number;
}

interface KPIs {
  avgOpenRate: number;
  avgCtor: number;
  unsubscribeRate: number;
  totalClicks: number;
  trends: {
    openRate: number;
    ctor: number;
    unsubscribeRate: number;
    totalClicks: number;
  };
}

interface FunnelStage {
  stage: string;
  value: number;
  color: string;
}

interface SummaryData {
  kpis: KPIs;
  funnelData: FunnelStage[];
  topCampaigns: Campaign[];
  rawCampaigns: Campaign[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl">
        <p className="text-white mb-2">{data.subject_line || data.campaign_id}</p>
        <div className="space-y-1 text-sm">
          <p className="text-slate-300">Sends: <span className="text-white">{data.sends?.toLocaleString()}</span></p>
          <p className="text-slate-300">Opens: <span className="text-white">{data.opens?.toLocaleString()}</span></p>
          <p className="text-slate-300">Clicks: <span className="text-teal-400">{data.clicks?.toLocaleString()}</span></p>
          <div className="border-t border-slate-700 my-2 pt-2">
            <p className="text-slate-300">Open Rate: <span className="text-purple-400">{(data.open_rate * 100).toFixed(2)}%</span></p>
            <p className="text-slate-300">CTOR: <span className="text-green-400">{(data.CTOR * 100).toFixed(2)}%</span></p>
            <p className="text-slate-300">Unsubscribes: <span className="text-red-400">{data.unsubscribe}</span></p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function EmailTab() {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  // 2. Use useState for summary data
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // AI Recommendations state
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  // 3. Use useEffect to fetch data on component mount
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`${API_URL}/api/email/summary`);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data: SummaryData = await response.json();
        setSummaryData(data);
      } catch (e) {
        if (e instanceof Error) {
          setError(`Failed to fetch email data: ${e.message}. Please ensure the backend server is running and accessible.`);
        } else {
          setError('An unknown error occurred.');
        }
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []); // Empty dependency array ensures this runs only once

  // Fetch AI recommendations after data is loaded
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!summaryData) return;
      
      setRecommendationsLoading(true);
      setRecommendationsError(null);
      
      try {
        // Create a data summary string from the KPIs
        const dataSummary = `
Email Campaign Performance Summary:
- Total Campaigns: ${summaryData.topCampaigns.length}
- Average Open Rate: ${summaryData.kpis.avgOpenRate.toFixed(1)}%
- Average Click-to-Open Rate (CTOR): ${summaryData.kpis.avgCtor.toFixed(1)}%
- Unsubscribe Rate: ${summaryData.kpis.unsubscribeRate.toFixed(2)}%
- Total Clicks: ${summaryData.kpis.totalClicks.toLocaleString()}
- Open Rate Trend: ${summaryData.kpis.trends.openRate > 0 ? '+' : ''}${summaryData.kpis.trends.openRate.toFixed(1)}%
- CTOR Trend: ${summaryData.kpis.trends.ctor > 0 ? '+' : ''}${summaryData.kpis.trends.ctor.toFixed(1)}%
- Top Campaign: "${summaryData.topCampaigns[0]?.subject_line}" with ${summaryData.topCampaigns[0]?.clicks} clicks
- Funnel Conversion: ${((summaryData.funnelData[2]?.value / summaryData.funnelData[0]?.value) * 100).toFixed(1)}% from sends to clicks
        `.trim();
        
        // Get authentication token from localStorage
        // Try both possible token keys (auth_token from normal login, token from OAuth)
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }
        
        // Make POST request to recommendations endpoint
        const response = await fetch(`${API_URL}/api/recommendations/email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data_summary: dataSummary
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to fetch recommendations: ${response.statusText}`);
        }
        
        const result = await response.json();
        setRecommendations(result.recommendations || []);
      } catch (e) {
        if (e instanceof Error) {
          setRecommendationsError(e.message);
        } else {
          setRecommendationsError('Failed to fetch AI recommendations.');
        }
        console.error('Recommendations error:', e);
      } finally {
        setRecommendationsLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [summaryData]); // Run when summaryData changes

  // 4. Handle loading and error states
  if (loading) {
    return <div className="text-center text-slate-400 p-8">Loading email campaign data...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 bg-red-900/20 p-4 rounded-lg">{error}</div>;
  }

  if (!summaryData || !summaryData.topCampaigns || summaryData.topCampaigns.length === 0) {
    return <div className="text-center text-slate-400 p-8">No campaign data available.</div>;
  }

  // Extract pre-calculated data from backend
  const { kpis, funnelData, topCampaigns } = summaryData;

  return (
    <div className="space-y-6">
      {/* Data Status Banner */}
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-semibold">Email Campaign Analytics</h2>
            <p className="text-slate-400 text-sm mt-1">
              Successfully loaded <span className="text-teal-400 font-semibold">{topCampaigns.length}</span> email campaigns from the backend
            </p>
          </div>
          <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-green-400 text-sm font-medium">Live Data</span>
          </div>
        </div>
      </Card>

      {/* KPI Cards - Now with backend-calculated data and trends */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Avg. Open Rate"
          value={kpis.avgOpenRate.toFixed(1)}
          suffix="%"
          trend={kpis.trends.openRate}
          icon={<Mail className="w-5 h-5" />}
        />
        <KPICard
          title="Avg. Click-to-Open Rate"
          value={kpis.avgCtor.toFixed(1)}
          suffix="%"
          trend={kpis.trends.ctor}
          icon={<MousePointer className="w-5 h-5" />}
        />
        <KPICard
          title="Unsubscribe Rate"
          value={kpis.unsubscribeRate.toFixed(2)}
          suffix="%"
          trend={kpis.trends.unsubscribeRate}
          icon={<UserMinus className="w-5 h-5" />}
        />
        <KPICard
          title="Total Clicks"
          value={kpis.totalClicks.toLocaleString()}
          trend={kpis.trends.totalClicks}
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* Funnel Chart - Now with dynamic data */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <h3 className="text-white mb-6">Email Campaign Funnel</h3>
        <div className="flex items-center justify-center py-8">
          <div className="relative w-full max-w-2xl">
            {funnelData.map((stage, index) => {
              const width = 100 - (index * 25);
              const marginLeft = (100 - width) / 2;
              
              return (
                <motion.div
                  key={stage.stage}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  onMouseEnter={() => setHoveredStage(index)}
                  onMouseLeave={() => setHoveredStage(null)}
                  className="relative mb-3 cursor-pointer"
                  style={{
                    width: `${width}%`,
                    marginLeft: `${marginLeft}%`,
                  }}
                >
                  <div
                    className="relative h-24 rounded transition-all duration-300 overflow-hidden group"
                    style={{
                      backgroundColor: stage.color,
                      opacity: hoveredStage === index ? 1 : 0.9,
                      transform: hoveredStage === index ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: hoveredStage === index 
                        ? `0 8px 24px ${stage.color}40` 
                        : 'none',
                    }}
                  >
                    {/* Hover overlay */}
                    {hoveredStage === index && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-white/10"
                      />
                    )}
                    
                    {/* Content */}
                    <div className="relative h-full flex flex-col items-center justify-center text-white">
                      <span className="text-sm opacity-90 mb-1">{stage.stage}</span>
                      <span className="text-2xl">{stage.value.toLocaleString()}</span>
                      <span className="text-xs opacity-75 mt-1">
                        {index === 0 ? '100%' : `${((stage.value / funnelData[0].value) * 100).toFixed(1)}% conversion`}
                      </span>
                    </div>

                    {/* Tooltip on hover */}
                    {hoveredStage === index && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl z-10 whitespace-nowrap"
                      >
                        <div className="text-sm space-y-1">
                          {index === 1 && (
                            <p className="text-slate-300">Open Rate: <span className="text-purple-400">{((funnelData[1].value / funnelData[0].value) * 100).toFixed(1)}%</span></p>
                          )}
                          {index === 2 && (
                            <>
                              <p className="text-slate-300">CTOR: <span className="text-green-400">{((funnelData[2].value / funnelData[1].value) * 100).toFixed(1)}%</span></p>
                              <p className="text-slate-300">Total Clicks: <span className="text-teal-400">{funnelData[2].value.toLocaleString()}</span></p>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Connector line */}
                  {index < funnelData.length - 1 && (
                    <div className="absolute left-1/2 -bottom-3 transform -translate-x-1/2 w-px h-3 bg-slate-600" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Top Campaigns - Now with backend data */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <h3 className="text-white mb-4">Top 10 Campaigns by Clicks</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topCampaigns} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="subject_line" type="category" stroke="#94a3b8" width={150} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(20, 184, 166, 0.1)' }} />
            <Bar dataKey="clicks" radius={[0, 4, 4, 0]}>
              {topCampaigns.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index < 3 ? '#14b8a6' : '#475569'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* AI-Powered Recommendations */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <h3 className="text-white">AI-Powered Recommendations</h3>
          <Sparkles className="w-4 h-4 text-purple-400 ml-1" />
        </div>
        
        {/* Loading State */}
        {recommendationsLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Generating AI recommendations...</p>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {recommendationsError && !recommendationsLoading && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm">⚠️ {recommendationsError}</p>
          </div>
        )}
        
        {/* Recommendations Display */}
        {!recommendationsLoading && !recommendationsError && recommendations.length > 0 && (
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="bg-slate-900/50 border-slate-700 p-4 hover:bg-slate-900 transition-all hover:border-teal-500/50 cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors flex-shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">
                          AI INSIGHT #{index + 1}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{recommendation}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* No Recommendations State */}
        {!recommendationsLoading && !recommendationsError && recommendations.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recommendations available at this time.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
