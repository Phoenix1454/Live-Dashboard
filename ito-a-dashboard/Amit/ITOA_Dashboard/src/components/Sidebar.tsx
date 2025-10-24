import { BarChart3, Mail, Linkedin, FileText, Search, Globe, Upload, TrendingUp, Settings, LogOut, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isSettingsPage = location.pathname === '/settings';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { id: 'blog', label: 'Blog', icon: FileText },
    { id: 'seo', label: 'SEO', icon: Search },
    { id: 'web', label: 'Web Analytics', icon: Globe },
    { id: 'upload', label: 'Upload CSV', icon: Upload },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2 mb-1 hover:opacity-80 transition-opacity">
          <TrendingUp className="w-6 h-6 text-teal-400" />
          <span className="text-white">ItoA</span>
        </Link>
        <h1 className="text-slate-400 text-sm">Smart Analytics for Growth</h1>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
              <User className="w-5 h-5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.full_name || user.username}</p>
              <p className="text-xs text-slate-400 truncate">{user.email || user.username}</p>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="p-4 border-b border-slate-800">
        <label className="text-xs text-slate-400 mb-2 block">Date Range</label>
        <Select defaultValue="30days">
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="12months">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link key={tab.id} to="/">
                <Button
                  variant={activeTab === tab.id && !isSettingsPage ? 'secondary' : 'ghost'}
                  className={`w-full justify-start ${
                    activeTab === tab.id && !isSettingsPage
                      ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  onClick={() => onTabChange(tab.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Settings Link */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <Link to="/settings">
            <Button
              variant={isSettingsPage ? 'secondary' : 'ghost'}
              className={`w-full justify-start ${
                isSettingsPage
                  ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
