'use client';

import "../globals.css";
import '../styles/general/index.css';
import SideBar from "../Components/sideBar";
import TopBar from '../Components/topBar';
import { useRequireStaff } from '../hooks/useAuth';

const ENABLE_AUTH = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useRequireStaff();

  // Show loading while checking auth (only when auth is enabled)
  if (ENABLE_AUTH && auth.isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-wrapper staff-theme">
      {/* Sidebar Navbar */}
      <SideBar />

      <div className="layout-right">
        <TopBar />

        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}