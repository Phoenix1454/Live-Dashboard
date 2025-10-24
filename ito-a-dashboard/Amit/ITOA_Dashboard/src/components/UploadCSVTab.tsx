import { useState } from 'react';
import { Upload, FileText, Sparkles, TrendingUp, Loader2, AlertCircle, CheckCircle2, Lightbulb, BarChart3 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { API_URL } from '../config';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  AreaChart, 
  Area,
  ScatterChart,
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { motion } from 'motion/react';

interface ColumnInterpretation {
  columns: {
    [key: string]: {
      meaning: string;
      type: 'dimension' | 'measure';
      category: string;
    };
  };
  primary_date_column: string | null;
  key_metrics: string[];
}

interface KPIDesign {
  name: string;
  description: string;
  calculation: string;
  columns_needed: string[];
  format: 'number' | 'percentage' | 'currency' | 'duration';
}

interface ChartDesign {
  title: string;
  chart_type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  description: string;
  x_axis: string | null;
  y_axis: string;
  grouping: string | null;
  aggregation: string;
}

interface DashboardDesign {
  kpis: KPIDesign[];
  charts: ChartDesign[];
}

interface ChartData {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  description: string;
  data: Array<{ label: string; value: number }>;
}

interface DynamicAnalysisResponse {
  channel_type: string;
  file_name: string;
  total_records: number;
  column_interpretation: ColumnInterpretation;
  dashboard_design: DashboardDesign;
  kpis: { [key: string]: number };
  charts: ChartData[];
  recommendations: string[];
  success: boolean;
  message: string;
}

export function UploadCSVTab() {
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DynamicAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null); // Clear any previous errors
    }
  };

  const handleAnalyze = async () => {
    if (!selectedChannel || !file) {
      setError('Please select a channel and upload a CSV file');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      console.log('🚀 Starting dynamic analysis...');
      console.log(`📊 Channel: ${selectedChannel}`);
      console.log(`📁 File: ${file.name}`);

      // Get auth token
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Call the dynamic analysis endpoint
      const response = await fetch(
        `${API_URL}/api/upload/dynamic-analysis/${selectedChannel}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Analysis failed: ${response.statusText}`);
      }

      const result: DynamicAnalysisResponse = await response.json();
      console.log('✅ Analysis complete:', result);

      setAnalysisResult(result);
    } catch (err) {
      console.error('❌ Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to format KPI values based on format type
  const formatKPIValue = (value: number, format: string): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'currency':
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'duration':
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60);
        return `${minutes}m ${seconds}s`;
      case 'number':
      default:
        return value >= 1000 
          ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : value.toFixed(2);
    }
  };

  // Dynamic chart renderer using switch statement
  const renderChart = (chart: ChartData, index: number) => {
    const COLORS = ['#14b8a6', '#8b5cf6', '#f97316', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

    const chartProps = {
      data: chart.data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="label" 
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
              />
              <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="label" 
                stroke="#94a3b8"
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
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chart.data.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
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
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...chartProps}>
              <defs>
                <linearGradient id={`colorArea${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#06b6d4" 
                fillOpacity={1} 
                fill={`url(#colorArea${index})`} 
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis dataKey="value" stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter name="Values" data={chart.data} fill="#f97316" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-[300px] text-slate-400">
            Unsupported chart type: {chart.type}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-white text-2xl mb-2 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-teal-400" />
          Dynamic CSV Analysis
        </h2>
        <p className="text-slate-400">
          Upload your CSV files and let AI automatically analyze, design dashboards, and generate insights
        </p>
      </div>

      {/* Upload Process Card */}
      <Card className="bg-slate-800 border-slate-700 p-8">
        <div className="space-y-6">
          {/* Step 1: Select Channel */}
          <div>
            <label className="text-white mb-3 block flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 text-white text-sm font-semibold">1</span>
              Select Channel Data Type
            </label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Choose a channel..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email Marketing</SelectItem>
                <SelectItem value="linkedin">LinkedIn Posts</SelectItem>
                <SelectItem value="blog">Blog Analytics</SelectItem>
                <SelectItem value="seo">SEO Metrics</SelectItem>
                <SelectItem value="web">Web Analytics</SelectItem>
                <SelectItem value="overview">General Overview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Upload File */}
          <div>
            <label className="text-white mb-3 block flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 text-white text-sm font-semibold">2</span>
              Upload Your CSV File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-teal-500 bg-teal-500/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              {file ? (
                <div>
                  <p className="text-white mb-2 font-semibold">{file.name}</p>
                  <p className="text-slate-400 text-sm">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-white mb-2">Drag and drop your CSV file here</p>
                  <p className="text-slate-400 text-sm mb-4">or</p>
                </>
              )}
              <label className="mt-4 inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="border-slate-600 text-white hover:bg-slate-700" 
                  asChild
                >
                  <span>{file ? 'Change File' : 'Browse Files'}</span>
                </Button>
              </label>
            </div>
          </div>

          {/* Step 3: Generate Analysis */}
          <div>
            <label className="text-white mb-3 block flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 text-white text-sm font-semibold">3</span>
              Generate AI-Powered Analysis
            </label>
            <Button
              onClick={handleAnalyze}
              disabled={!selectedChannel || !file || isAnalyzing}
              className="w-full bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing... (This may take 10-20 seconds)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Data with AI
                </>
              )}
            </Button>
          </div>

          {/* Processing Info */}
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-blue-400 font-semibold mb-1">AI Analysis in Progress</p>
                  <p className="text-slate-300 text-sm">
                    The AI is performing 6 steps: Data profiling → Column interpretation → 
                    Dashboard design → Calculations → Recommendations → Assembly
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-400 font-semibold mb-1">Analysis Failed</p>
                  <p className="text-slate-300 text-sm">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </Card>

      {/* Dynamic Dashboard Results */}
      {analysisResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Success Banner */}
          <Card className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border-green-500/20 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <div className="flex-1">
                <p className="text-white font-semibold">Analysis Complete!</p>
                <p className="text-slate-300 text-sm">{analysisResult.message}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs">File</p>
                <p className="text-white text-sm font-semibold">{analysisResult.file_name}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs">Records</p>
                <p className="text-white text-sm font-semibold">{analysisResult.total_records.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          {/* Dynamic KPI Cards */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h3 className="text-white text-lg font-semibold">Key Performance Indicators</h3>
              <span className="text-slate-400 text-sm">({Object.keys(analysisResult.kpis).length} metrics)</span>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(analysisResult.kpis).map(([kpiName, kpiValue], index) => {
                // Find the KPI design to get the format
                const kpiDesign = analysisResult.dashboard_design.kpis.find(
                  (k) => k.name === kpiName
                );
                const format = kpiDesign?.format || 'number';

                return (
                  <motion.div
                    key={kpiName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="bg-slate-800 border-slate-700 p-6 hover:border-teal-500/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-slate-400 text-sm font-medium">{kpiName}</h4>
                        <div className="w-2 h-2 rounded-full bg-teal-400" />
                      </div>
                      <p className="text-white text-3xl font-bold mb-2">
                        {formatKPIValue(kpiValue, format)}
                      </p>
                      {kpiDesign && (
                        <p className="text-slate-500 text-xs">{kpiDesign.description}</p>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Charts */}
          {analysisResult.charts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-white text-lg font-semibold">Data Visualizations</h3>
                <span className="text-slate-400 text-sm">({analysisResult.charts.length} charts)</span>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {analysisResult.charts.map((chart, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="bg-slate-800 border-slate-700 p-6">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-semibold">{chart.title}</h4>
                          <span className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {chart.type.toUpperCase()}
                          </span>
                        </div>
                        {chart.description && (
                          <p className="text-slate-400 text-sm">{chart.description}</p>
                        )}
                      </div>
                      
                      {chart.data.length > 0 ? (
                        renderChart(chart, index)
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-slate-500">
                          No data available for this chart
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          {analysisResult.recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-slate-800 border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-white text-lg font-semibold">AI-Generated Recommendations</h3>
                  <span className="text-slate-400 text-sm">({analysisResult.recommendations.length} insights)</span>
                </div>

                <div className="space-y-3">
                  {analysisResult.recommendations.map((recommendation, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                      className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 hover:border-teal-500/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                          <span className="text-yellow-400 text-xs font-bold">{index + 1}</span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed flex-1">
                          {recommendation}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Column Interpretation (Optional - can be expanded) */}
          <details className="group">
            <summary className="cursor-pointer list-none">
              <Card className="bg-slate-800 border-slate-700 p-4 hover:border-slate-600 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-white text-sm font-medium">View Column Interpretation Details</span>
                  </div>
                  <span className="text-slate-400 text-xs group-open:rotate-180 transition-transform">▼</span>
                </div>
              </Card>
            </summary>
            
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <Card className="bg-slate-800 border-slate-700 p-6">
                <h4 className="text-white font-semibold mb-4">AI Column Interpretation</h4>
                <div className="space-y-2">
                  {Object.entries(analysisResult.column_interpretation.columns).map(([colName, colInfo]) => (
                    <div key={colName} className="bg-slate-900 rounded p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-teal-400 font-mono">{colName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          colInfo.type === 'measure' 
                            ? 'bg-blue-500/10 text-blue-400' 
                            : 'bg-purple-500/10 text-purple-400'
                        }`}>
                          {colInfo.type}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {colInfo.category}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">{colInfo.meaning}</p>
                    </div>
                  ))}
                </div>
                
                {analysisResult.column_interpretation.primary_date_column && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-slate-400 text-sm">
                      <span className="font-semibold">Primary Date Column:</span>{' '}
                      <span className="text-teal-400 font-mono">
                        {analysisResult.column_interpretation.primary_date_column}
                      </span>
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          </details>
        </motion.div>
      )}
    </div>
  );
}
