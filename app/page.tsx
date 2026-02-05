// app/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './hooks/useAuth';
import { getPositionBasedRedirectPath, redirectToAuth } from './lib/auth';

const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';

export default function Home() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [showRoleSelection, setShowRoleSelection] = useState(!ENABLE_AUTH);

  useEffect(() => {
    if (!ENABLE_AUTH) {
      // Auth disabled - show role selection
      setShowRoleSelection(true);
      return;
    }

    if (isLoading) return;

    if (isAuthenticated && user) {
      // Redirect based on position (Finance Manager = admin, Finance Assistant = staff)
      const redirectPath = getPositionBasedRedirectPath(user.positionName);
      router.push(`${redirectPath}/dashboard`);
    } else {
      // No valid token - redirect to auth
      redirectToAuth();
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading while checking auth
  if (ENABLE_AUTH && isLoading) {
    return (
      <div className="role-selection-page">
        <div className="role-selection-container">
          <div className="logo-section">
            <img src="/agilaLogo.png" alt="FTMS Logo" className="logo" />
            <h1>Financial Transaction Management System</h1>
            <p>Authenticating...</p>
            <div className="loading-spinner" />
          </div>
        </div>
        <style jsx>{`
          .role-selection-page {
            min-height: 100vh;
            background: var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .role-selection-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 400px;
            width: 100%;
            text-align: center;
          }
          .logo-section { margin-bottom: 20px; }
          .logo { width: 80px; height: 80px; margin-bottom: 20px; }
          .logo-section h1 { color: #333; margin-bottom: 10px; font-size: 1.5rem; }
          .logo-section p { color: #666; font-size: 1.1rem; }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If auth is enabled and redirecting, show nothing (or minimal loading)
  if (ENABLE_AUTH && !showRoleSelection) {
    return null;
  }

  // Role selection page (only shown when auth is disabled)
  return (
    <div className="role-selection-page">
      <div className="role-selection-container">
        <div className="logo-section">
          <img src="/agilaLogo.png" alt="FTMS Logo" className="logo" />
          <h1>Financial Transaction Management System</h1>
          <p>Please select your role to continue</p>
        </div>
        
        <div className="role-cards">
          <div className="role-card admin-card" onClick={() => window.location.href = '/admin/dashboard'}>
            <div className="role-icon"><i className="ri-user-settings-fill"/></div>
            <h2>Administrator</h2>
            <p>Full access to all system features including user management, reports, and system configuration.</p>
          </div>
          
          <div className="role-card staff-card" onClick={() => window.location.href = '/staff/dashboard'}>
            <div className="role-icon"><i className="ri-nurse-fill"/></div>
            <h2>Staff Member</h2>
            <p>Access to daily operations including transactions, expenses, and basic reporting features.</p>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .role-selection-page {
          min-height: 100vh;
          background: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .role-selection-container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          padding: 40px;
          max-width: 800px;
          width: 100%;
          text-align: center;
        }
        
        .logo-section {
          margin-bottom: 40px;
        }
        
        .logo {
          width: 80px;
          height: 80px;
          margin-bottom: 20px;
        }
        
        .logo-section h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 2rem;
        }
        
        .logo-section p {
          color: #666;
          font-size: 1.1rem;
        }
        
        .role-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          margin-top: 40px;
          cursor: pointer;
        }
        
        .role-card {
          background: #f8f9ff;
          border-radius: 15px;
          padding: 30px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border: 2px solid transparent;
        }
        
        .role-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.1);
        }
        
        .admin-card:hover {
          border-color: var(--primary-color);
        }
        
        .staff-card:hover {
          border-color: var(--secondary-color);
        }
        
        .role-icon {
          font-size: 3rem;
          margin-bottom: 20px;
        }
        
        .role-card h2 {
          color: #333;
          margin-bottom: 15px;
          font-size: 1.5rem;
        }
        
        .role-card p {
          color: #666;
          margin-bottom: 25px;
          line-height: 1.6;
        }
        
        .role-button {
          padding: 12px 30px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        }
        
        .admin-button {
          background:  var(--primary-color);
          color: white;
        }
        
        .admin-button:hover {
          background: var(--primary-hover-color);
        }
        
        .staff-button {
          background: var(--secondary-color);
          color: white;
        }
        
        .staff-button:hover {
          background: var(--secondary-hover-color);
        }
        
        @media (max-width: 768px) {
          .role-selection-container {
            padding: 20px;
          }
          
          .role-cards {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .logo-section h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
