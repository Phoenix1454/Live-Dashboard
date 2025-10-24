/**
 * API utility functions for making authenticated requests
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

/**
 * Get the stored authentication token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Make an authenticated GET request
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    // Clear auth data and redirect to login
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
    throw new Error('Authentication expired. Please login again.');
  }

  return response;
}

/**
 * Make an authenticated POST request
 */
export async function authenticatedPost(
  endpoint: string,
  data: unknown
): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Make an authenticated PUT request
 */
export async function authenticatedPut(
  endpoint: string,
  data: unknown
): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Make an authenticated DELETE request
 */
export async function authenticatedDelete(endpoint: string): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: 'DELETE',
  });
}

/**
 * Upload file with authentication
 */
export async function authenticatedFileUpload(
  endpoint: string,
  formData: FormData
): Promise<Response> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {};

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
    throw new Error('Authentication expired. Please login again.');
  }

  return response;
}
