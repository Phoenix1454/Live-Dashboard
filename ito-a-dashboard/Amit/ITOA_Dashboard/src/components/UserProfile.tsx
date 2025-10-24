import { useAuth } from '../contexts/AuthContext';
import { User } from 'lucide-react';

export function UserProfile() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
      {/* User Avatar */}
      <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
        <User className="w-5 h-5 text-teal-400" />
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {user.full_name || user.username}
        </p>
        <p className="text-xs text-slate-400 truncate">
          {user.email || user.username}
        </p>
      </div>
    </div>
  );
}
