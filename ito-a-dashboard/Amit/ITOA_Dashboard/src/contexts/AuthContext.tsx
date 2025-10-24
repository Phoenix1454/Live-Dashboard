import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../config';

// Define the User interface
interface User {
  username: string;
  email?: string;
  full_name?: string;
  disabled?: boolean;
}

// Define the Authentication Context interface
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

// Create the context with undefined as default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// LocalStorage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * AuthProvider component that wraps the application and provides authentication state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize authentication state from localStorage on mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          // Verify token is still valid by fetching user profile
          const isValid = await verifyToken(storedToken);
          
          if (isValid) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear storage
            clearAuthData();
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Verify if a token is still valid by making a request to the backend
   */
  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token verification failed:', error);
      // If backend is not reachable, don't block the user
      // Just clear auth and let them login again
      return false;
    }
  };

  /**
   * Clear authentication data from state and localStorage
   */
  const clearAuthData = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  /**
   * Login function - authenticates user and stores token
   */
  const login = async (username: string, password: string): Promise<void> => {
    setError(null);
    setIsLoading(true);

    try {
      
      const tokenResponse = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const { access_token } = await tokenResponse.json();

      
      const userResponse = await fetch(`${API_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const userData: User = await userResponse.json();

      
      setToken(access_token);
      setUser(userData);
      setIsAuthenticated(true);

      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      console.log('✅ Login successful:', userData.username);
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      clearAuthData();
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout function - clears authentication state
   */
  const logout = () => {
    clearAuthData();
    setError(null);
    console.log('✅ Logout successful');
  };

  // Context value
  const value: AuthContextType = {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use the Auth context
 * Throws an error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to get the current authentication token
 * Useful for making authenticated API requests
 */
export function useAuthToken(): string | null {
  const { token } = useAuth();
  return token;
}

/**
 * Hook to get the current user
 */
export function useCurrentUser(): User | null {
  const { user } = useAuth();
  return user;
}
