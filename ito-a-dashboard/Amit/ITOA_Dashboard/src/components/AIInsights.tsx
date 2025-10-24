import { Lightbulb, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Insight {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface AIInsightsProps {
  insights: Insight[];
  featureImportance?: { feature: string; importance: number }[];
}

export function AIInsights({ insights, featureImportance }: AIInsightsProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Recommendations */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <h2 className="text-white">Key Recommendations</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight, index) => (
            <Card key={index} className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-start gap-3">
                <div className={`px-2 py-1 rounded text-xs border ${getImpactColor(insight.impact)}`}>
                  {insight.impact.toUpperCase()}
                </div>
                <div className="flex-1">
                  <h4 className="text-white mb-1">{insight.title}</h4>
                  <p className="text-slate-400 text-sm">{insight.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Feature Importance Chart */}
      {featureImportance && featureImportance.length > 0 && (
        <Card className="bg-slate-800 border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <h3 className="text-white">What Drives Future Visitors?</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureImportance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="feature" type="category" stroke="#94a3b8" width={150} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="importance" fill="#14b8a6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
