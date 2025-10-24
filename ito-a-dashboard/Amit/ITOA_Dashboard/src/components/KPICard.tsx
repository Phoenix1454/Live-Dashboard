import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card } from './ui/card';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  suffix?: string;
  icon?: React.ReactNode;
}

export function KPICard({ title, value, trend, suffix = '', icon }: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return <Minus className="w-4 h-4" />;
    if (trend > 0) return <ArrowUp className="w-4 h-4" />;
    return <ArrowDown className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-slate-500';
    if (trend > 0) return 'text-green-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-slate-800 border-slate-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-slate-400 text-sm">{title}</h3>
        {icon && <div className="text-teal-400">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-white text-3xl mb-1">
            {value}
            {suffix && <span className="text-xl text-slate-400 ml-1">{suffix}</span>}
          </p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm">
                {Math.abs(trend)}% vs last period
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
