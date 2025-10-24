import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { API_URL } from '../config';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(true);
  const hasProcessed = useRef(false); // Prevent double processing

  useEffect(() => {
    // If already processed, don't run again
    if (hasProcessed.current) {
      console.log('⚠️ OAuth callback already processed, skipping...');
      return;
    }

    const processCallback = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

      console.log('🔵 OAuth callback triggered', { token: token ? 'present' : 'missing', error: errorParam });

      // Handle error from backend
      if (errorParam) {
        setError(errorParam);
        setProcessing(false);
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
        return;
      }

      // Handle successful OAuth
      if (token) {
        hasProcessed.current = true; // Mark as processed IMMEDIATELY
        
        try {
          console.log('🔵 OAuth callback: Processing token...');
          
          // Fetch user profile with this token
          const response = await fetch(`${API_URL}/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }

          const user = await response.json();
          console.log('✅ OAuth callback: User profile fetched', user.username);

          // Clear any existing auth data first
          console.log('🔵 Clearing old auth data...');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Clear OAuth in progress flag
          sessionStorage.removeItem('oauth_in_progress');
          
          // Store new token and user data
          console.log('🔵 Storing new auth data...');
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(user));
          
          console.log('✅ OAuth callback: Token and user stored successfully');

          // Small delay to ensure localStorage is written
          await new Promise(resolve => setTimeout(resolve, 200));

          // Verify storage
          const storedToken = localStorage.getItem('auth_token');
          const storedUser = localStorage.getItem('auth_user');
          console.log('🔍 Verification:', { 
            tokenStored: !!storedToken, 
            userStored: !!storedUser 
          });

          if (!storedToken || !storedUser) {
            throw new Error('Failed to store auth data in localStorage');
          }

          // Navigate to dashboard
          console.log('✅ OAuth callback complete: Redirecting to dashboard...');
          
          // Use window.location for a hard refresh to ensure AuthContext reloads
          setTimeout(() => {
            window.location.href = '/';
          }, 300);
          
        } catch (err) {
          console.error('❌ OAuth callback failed:', err);
          hasProcessed.current = false; // Reset on error
          setError('Failed to complete sign in. Please try again.');
          setProcessing(false);
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
        }
      } else {
        // No token and no error - invalid callback
        console.error('❌ OAuth callback: No token received');
        setError('Invalid callback. Missing authentication token.');
        setProcessing(false);
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, []); // Empty deps - only run once on mount

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center max-w-md">
        {error ? (
          <>
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <p className="text-red-400 text-lg mb-2">Authentication Error</p>
            <p className="text-slate-400">{error}</p>
            <p className="text-slate-500 text-sm mt-4">Redirecting to login...</p>
          </>
        ) : processing ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
            <p className="text-slate-400 text-lg">Completing sign in...</p>
            <p className="text-slate-500 text-sm mt-2">Please wait while we log you in</p>
            <p className="text-slate-600 text-xs mt-4">Do not refresh or navigate away</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
