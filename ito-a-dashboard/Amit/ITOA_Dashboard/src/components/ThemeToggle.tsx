import { Sun, Moon, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'motion/react';

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'beast':
        return <Zap className="w-5 h-5" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'beast':
        return 'Beast';
    }
  };

  const getColors = () => {
    switch (theme) {
      case 'light':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/30';
      case 'dark':
        return 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700';
      case 'beast':
        return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/50';
    }
  };

  return (
    <motion.button
      onClick={cycleTheme}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${getColors()}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {getIcon()}
      </motion.div>
      <span className="text-sm font-medium">{getLabel()}</span>
    </motion.button>
  );
}
