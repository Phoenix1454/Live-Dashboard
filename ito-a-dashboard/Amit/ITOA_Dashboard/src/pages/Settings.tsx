import { useState } from 'react';
import { Settings as SettingsIcon, Upload as UploadIcon, Link2, AlertCircle, FileUp, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { API_URL } from '../config';

export function Settings() {
  const { user } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Profile Settings State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Please select a valid CSV file');
        setSelectedFile(null);
      }
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!selectedChannel) {
      setError('Please select a channel type');
      return;
    }
    if (!selectedFile) {
      setError('Please select a CSV file');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_URL}/api/upload/${selectedChannel}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze file');
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileUpdateError('');
    setProfileUpdateSuccess(false);

    // Validate passwords if user is trying to change password
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setProfileUpdateError('Current password is required to change password');
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileUpdateError('New passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        setProfileUpdateError('New password must be at least 6 characters');
        return;
      }
    }

    // TODO: Implement API call to update user profile
    // For now, just show success message
    try {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProfileUpdateSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setProfileUpdateSuccess(false), 3000);
    } catch (err: any) {
      setProfileUpdateError(err.message || 'Failed to update profile');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-8 h-8 text-teal-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Application Settings</h1>
          <p className="text-slate-400">Manage your data sources and integrations</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid gap-6">
        {/* Profile Settings Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-semibold text-white">Profile Settings</h2>
          </div>
          
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            {/* Username Display (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">Username cannot be changed</p>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            {/* Password Change Section */}
            <div className="pt-4 border-t border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Change Password</h3>
              
              <div className="space-y-3">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            {/* Success Message */}
            {profileUpdateSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-green-400">Profile updated successfully!</p>
              </div>
            )}

            {/* Error Message */}
            {profileUpdateError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-400">{profileUpdateError}</p>
              </div>
            )}

            {/* Save Button */}
            <Button
              type="submit"
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium"
            >
              Save Changes
            </Button>
          </form>
        </div>

        {/* Upload Your Own Data Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <UploadIcon className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-semibold text-white">Upload Your Own Data</h2>
          </div>
          
          <div className="space-y-4">
            {/* Channel Type Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Channel Type
              </label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Choose a channel..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="seo">SEO</SelectItem>
                  <SelectItem value="web">Web Analytics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Upload CSV File
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600 cursor-pointer"
                />
              </div>
              {selectedFile && (
                <p className="mt-2 text-sm text-teal-400 flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Generate Analysis Button */}
            <Button
              onClick={handleGenerateAnalysis}
              disabled={!selectedChannel || !selectedFile || isAnalyzing}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analyzing...' : 'Generate Analysis'}
            </Button>

            {/* Analysis Result */}
            {analysisResult && (
              <div className="mt-4 p-4 bg-slate-900 border border-slate-700 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Analysis Results</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Channel:</span>
                    <span className="text-white capitalize">{analysisResult.channel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Records:</span>
                    <span className="text-white">{analysisResult.totalRecords}</span>
                  </div>
                  {analysisResult.metrics && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Metrics:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(analysisResult.metrics).map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <span className="text-xs text-slate-400 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-sm text-white font-medium">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live API Integrations Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Link2 className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-semibold text-white">Live API Integrations</h2>
          </div>
          
          <div className="space-y-4">
            {/* Info Note */}
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm text-blue-300 font-medium mb-1">Feature Coming Soon</p>
                <p className="text-sm text-blue-200/80">
                  Live API integrations are currently under development. You'll be able to connect directly to Google Ads, Meta (Facebook/Instagram), and other platforms in a future release.
                </p>
              </div>
            </div>

            {/* Integration Buttons */}
            <div className="space-y-3">
              <Button
                disabled
                className="w-full justify-start bg-slate-700 text-slate-500 cursor-not-allowed opacity-60"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                Connect to Google Ads
              </Button>

              <Button
                disabled
                className="w-full justify-start bg-slate-700 text-slate-500 cursor-not-allowed opacity-60"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Connect to Meta API
              </Button>
            </div>

            {/* Additional Info */}
            <p className="text-xs text-slate-500 mt-4">
              When available, these integrations will automatically sync your advertising data in real-time, eliminating the need for manual CSV uploads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
