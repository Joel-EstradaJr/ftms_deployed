'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AuthUser,
  initializeAuth,
  getCurrentUser,
  getToken,
  setToken,
  removeToken,
  getRoleBasedRedirectPath,
  redirectToAuth,
} from '../lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth.agilabuscorp.me';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Validate route access based on role
  const validateRouteAccess = useCallback((authUser: AuthUser, currentPath: string) => {
    if (!authUser) return;

    const isAdminRoute = currentPath.startsWith('/admin');

    if (!authUser.isAdmin && isAdminRoute) {
      // Non-admin trying to access admin route
      router.push('/staff/dashboard');
    }
  }, [router]);

  // Initialize auth on mount
  useEffect(() => {
    if (!ENABLE_AUTH) {
      setIsLoading(false);
      return;
    }

    const authUser = initializeAuth();
    const storedToken = getToken();

    if (authUser && storedToken) {
      setUser(authUser);
      setTokenState(storedToken);
      
      // Handle role-based routing
      if (pathname === '/') {
        const redirectPath = getRoleBasedRedirectPath(authUser.role);
        router.push(`${redirectPath}/dashboard`);
      } else {
        // Validate current route matches user role
        validateRouteAccess(authUser, pathname);
      }
    } else {
      // No valid token - redirect to auth
      redirectToAuth();
    }

    setIsLoading(false);
  }, [pathname, router, validateRouteAccess]);

  // Login handler
  const login = useCallback((newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
    
    const authUser = getCurrentUser();
    if (authUser) {
      setUser(authUser);
      const redirectPath = getRoleBasedRedirectPath(authUser.role);
      router.push(`${redirectPath}/dashboard`);
    }
  }, [router]);

  // Logout handler
  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setTokenState(null);
    
    if (ENABLE_AUTH) {
      // Redirect to external auth URL
      window.location.href = AUTH_URL;
    } else {
      router.push('/');
    }
  }, [router]);

  // Refresh user data from token
  const refreshUser = useCallback(() => {
    const authUser = getCurrentUser();
    const storedToken = getToken();
    setUser(authUser);
    setTokenState(storedToken);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    // Return a default context for when auth is disabled
    if (process.env.NEXT_PUBLIC_ENABLE_AUTH !== 'true') {
      return {
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        login: () => {},
        logout: () => {},
        refreshUser: () => {},
      };
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to require authentication - redirects if not authenticated
 */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      if (process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true') {
        redirectToAuth();
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  return auth;
}

/**
 * Hook to require admin role
 */
export function useRequireAdmin() {
  const auth = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && auth.user && !auth.user.isAdmin) {
      router.push('/staff/dashboard');
    }
  }, [auth.isLoading, auth.user, router]);

  return auth;
}

export default useAuth;
