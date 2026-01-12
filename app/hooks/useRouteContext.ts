"use client";

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

export type UserRole = 'admin' | 'staff';

export interface RouteContext {
  userRole: UserRole | null;
  baseUrl: string;
  isRoleBasedRoute: boolean;
}

export const useRouteContext = (): RouteContext => {
  const pathname = usePathname();

  const context = useMemo(() => {
    
    // Check if we're in a role-based route
    if (pathname.startsWith('/admin')) {
      return {
        userRole: 'admin' as UserRole,
        baseUrl: '/admin',
        isRoleBasedRoute: true
      };
    }
    
    if (pathname.startsWith('/staff')) {
      return {
        userRole: 'staff' as UserRole,
        baseUrl: '/staff',
        isRoleBasedRoute: true
      };
    }

    // Check for role-specific paths that are missing the prefix (404 pages)
    // This can happen if someone directly navigates to /jev/chart-of-accounts
    // In this case, we should still treat it as a role-based route
    // by checking if the path matches known role-based routes
    const roleBasedPaths = ['/jev/', '/dashboard', '/revenue', '/expense', '/reimbursement', '/payroll', '/loan-management/', '/report', '/audit', '/budget-management/'];
    const isKnownRolePath = roleBasedPaths.some(rolePath => pathname.includes(rolePath));
    
    if (isKnownRolePath) {
      // Default to admin for known role-based paths without prefix
      return {
        userRole: 'admin' as UserRole,
        baseUrl: '/admin',
        isRoleBasedRoute: true
      };
    }

    // Default fallback (for role selection page, etc.)
    return {
      userRole: null,
      baseUrl: '',
      isRoleBasedRoute: false
    };
  }, [pathname]);

  return context;
};

export const useNavigationUrl = () => {
  const pathname = usePathname();
  const { baseUrl, isRoleBasedRoute, userRole } = useRouteContext();
  
  const getUrl = (path: string): string => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    if (isRoleBasedRoute) {
      const finalUrl = `${baseUrl}/${cleanPath}`;
      return finalUrl;
    }
    
    // Fallback to original path if not in role-based route
    const finalUrl = `/${cleanPath}`;
    return finalUrl;
  };

  return { getUrl, userRole };
};