/**
 * JWT Authentication Utilities for FTMS
 * Handles token storage, decoding, validation, and session management
 */

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth.agilabuscorp.me';

export interface JwtPayload {
  sub: string;
  employeeId?: string;
  employeeNumber?: string;
  role: string;
  departmentName?: string[];
  departmentIds?: string[];
  positionName?: string[];
  jti?: string;
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
}

// Position names that grant admin access (Finance Manager)
// All other positions are treated as staff
const ADMIN_POSITIONS = ['Finance Manager'];

export interface AuthUser {
  id: string;
  employeeId?: string;
  employeeNumber?: string;
  role: string;
  departmentName?: string[];
  departmentIds?: string[];
  positionName?: string[];
  isAdmin: boolean; // true if positionName includes Finance Manager
}

/**
 * Decode a JWT token without verification (client-side)
 * Note: For security, tokens should be verified server-side
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    // Handle base64url encoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true;
  }
  
  // Add 30 second buffer for clock skew
  const expirationTime = payload.exp * 1000;
  const now = Date.now();
  
  return now >= expirationTime - 30000;
}

/**
 * Get the stored auth token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Store the auth token
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Remove the stored auth token
 */
export function removeToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Get the current authenticated user from the stored token
 */
export function getCurrentUser(): AuthUser | null {
  const token = getToken();
  if (!token) {
    return null;
  }
  
  if (isTokenExpired(token)) {
    removeToken();
    return null;
  }
  
  const payload = decodeToken(token);
  if (!payload) {
    removeToken();
    return null;
  }
  
  // Check if user has admin position (Finance Manager)
  const hasAdminPosition = payload.positionName?.some(
    (pos) => ADMIN_POSITIONS.includes(pos)
  ) ?? false;

  return {
    id: payload.sub,
    employeeId: payload.employeeId,
    employeeNumber: payload.employeeNumber,
    role: payload.role,
    departmentName: payload.departmentName,
    departmentIds: payload.departmentIds,
    positionName: payload.positionName,
    isAdmin: hasAdminPosition,
  };
}

/**
 * Check if user has a valid session
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) {
    return false;
  }
  return !isTokenExpired(token);
}

/**
 * Check if any position in the array grants admin access
 */
export function hasAdminPosition(positionName?: string[]): boolean {
  if (!positionName || positionName.length === 0) {
    return false;
  }
  return positionName.some((pos) => ADMIN_POSITIONS.includes(pos));
}

/**
 * Get the appropriate redirect path based on position name
 * Finance Manager -> /admin
 * Finance Assistant or others -> /staff
 */
export function getPositionBasedRedirectPath(positionName?: string[]): string {
  if (hasAdminPosition(positionName)) {
    return '/admin';
  }
  return '/staff';
}

/**
 * @deprecated Use getPositionBasedRedirectPath instead
 * Get the appropriate redirect path based on user role
 */
export function getRoleBasedRedirectPath(role: string): string {
  if (role === 'ADMIN') {
    return '/admin';
  }
  return '/staff';
}

/**
 * Redirect to the external auth URL
 */
export function redirectToAuth(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Store the current URL to redirect back after login
  const currentUrl = window.location.href;
  const returnUrl = encodeURIComponent(currentUrl);
  
  window.location.href = `${AUTH_URL}?returnUrl=${returnUrl}`;
}

/**
 * Handle logout - clear token and redirect to auth
 */
export function logout(): void {
  removeToken();
  redirectToAuth();
}

/**
 * Extract token from URL query params (for OAuth/SSO flows)
 * Call this on app load to capture tokens from auth redirects
 */
export function extractTokenFromUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || urlParams.get('access_token');
  
  if (token) {
    // Clean up the URL
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.delete('access_token');
    window.history.replaceState({}, '', url.toString());
    
    return token;
  }
  
  return null;
}

/**
 * Initialize auth - extract token from URL if present, validate existing token
 * Returns the authenticated user or null
 */
export function initializeAuth(): AuthUser | null {
  // First, check if there's a token in the URL (from auth redirect)
  const urlToken = extractTokenFromUrl();
  if (urlToken && !isTokenExpired(urlToken)) {
    setToken(urlToken);
  }
  
  // Return the current user (if any)
  return getCurrentUser();
}
