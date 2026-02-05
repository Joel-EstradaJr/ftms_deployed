/**
 * API Client for FTMS Backend
 * Handles all HTTP requests to the backend API
 */

import { getToken, removeToken, redirectToAuth } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';

/**
 * Get authorization headers based on ENABLE_AUTH environment variable
 * When ENABLE_AUTH is false, no Authorization header is sent
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Only add Authorization header when auth is enabled
  if (ENABLE_AUTH && typeof window !== 'undefined') {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handle API response errors, including 401 unauthorized
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Token expired or invalid - clear and redirect to auth
    if (ENABLE_AUTH && typeof window !== 'undefined') {
      removeToken();
      redirectToAuth();
    }
    throw new ApiError(401, 'Unauthorized - Please log in again');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, error.message || 'Request failed', error);
  }

  return response.json();
}

/**
 * Main API client with methods for HTTP requests
 */
export const api = {
  get: async <T>(endpoint: string, params?: Record<string, any>): Promise<T> => {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    
    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    return handleResponse<T>(response);
  },

  post: async <T>(endpoint: string, data?: any): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleResponse<T>(response);
  },

  put: async <T>(endpoint: string, data?: any): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleResponse<T>(response);
  },

  patch: async <T>(endpoint: string, data?: any): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleResponse<T>(response);
  },

  delete: async <T>(endpoint: string, data?: any): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    return handleResponse<T>(response);
  },
};

export default api;
