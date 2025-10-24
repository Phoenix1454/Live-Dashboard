import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { LoginPage } from './pages/LoginPage';
import { AuthCallback } from './pages/AuthCallback';
import { ProtectedRoute } from './components/ProtectedRoute';

function AppContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Route - Login */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        } 
      />

      {/* OAuth Callback Route */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Protected Routes - Dashboard and Settings */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex h-screen bg-slate-950 overflow-hidden">
              <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
              <main className="flex-1 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto p-8">
                  {/* Theme Toggle - Top Right */}
                  <div className="flex justify-end mb-4">
                    <ThemeToggle />
                  </div>
                  
                  {/* Routes */}
                  <Routes>
                    <Route path="/" element={<Dashboard activeTab={activeTab} />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </div>
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
