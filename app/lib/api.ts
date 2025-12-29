/**
 * Mock API utilities for UI-only frontend
 * This file provides mock data utilities without any network calls
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Keep ApiError for backwards compatibility but it won't be thrown
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

// No actual API calls - this is a pure UI-only frontend
export const api = {
  get: async <T>(_endpoint: string): Promise<T> => {
    throw new Error('API calls are disabled in UI-only mode');
  },
  post: async <T>(_endpoint: string, _data?: any): Promise<T> => {
    throw new Error('API calls are disabled in UI-only mode');
  },
  put: async <T>(_endpoint: string, _data?: any): Promise<T> => {
    throw new Error('API calls are disabled in UI-only mode');
  },
  patch: async <T>(_endpoint: string, _data?: any): Promise<T> => {
    throw new Error('API calls are disabled in UI-only mode');
  },
  delete: async <T>(_endpoint: string): Promise<T> => {
    throw new Error('API calls are disabled in UI-only mode');
  },
};

export default api;
