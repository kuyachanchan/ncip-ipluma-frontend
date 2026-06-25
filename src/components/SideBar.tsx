/* eslint-disable @typescript-eslint/no-unused-vars */
// Sidebar.tsx - Complete working version with WebSocket
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { useSettings } from '@/hooks/useSettings';
import {
  Files, Gauge, HatGlasses, Lock, Share2,
  Unplug, Users, Bell, LogOut, ChevronLeft,
  ChevronRight, ChevronDown, Shield, FileCheck, Menu, X,
  Trash2
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import api from '@/api/axiosInstance';

interface SidebarProps {
  children?: React.ReactNode;
}

interface MenuItem {
  icon?: React.ReactNode;
  label?: string;
  path?: string;
  children?: MenuItem[];
  isOpen?: boolean;
  type?: 'divider' | 'section';
  sectionLabel?: string;
  badge?: number | null;
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isFullScreen } = useSettings();
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Initial fetch of notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        if (!user?.id) return;
        const response = await api.get(`v1/notifications/unread-count/${user.id}`);
        setNotificationCount(response.data);
      } catch {
        setNotificationCount(0);
      }
    };
    fetchNotificationCount();
  }, [user?.id]);

  // Simplified WebSocket connection - using direct topic for user
  const { isConnected } = useWebSocket({
    autoConnect: true,
    topics: user?.id ? [`/topic/notifications/${user.id}`] : [],
    onMessage: (topic, message) => {
      console.log('📡 WebSocket message received:', { topic, message });

      // ✅ Handle plain number, { count: n }, or stringified number
      let count: number;
      if (typeof message === 'number') {
        count = message;
      } else if (typeof message === 'object' && message !== null && 'count' in message) {
        count = Number(message.count);
      } else {
        count = Number(message); // fallback for stringified numbers
      }

      if (!isNaN(count)) {
        setNotificationCount(count);
      } else {
        console.warn('⚠️ Unexpected notification message format:', message);
      }
    },
    onConnect: () => {
      console.log('✅ WebSocket connected');
    },
    onError: (error) => {
      console.error('❌ WebSocket error:', error);
    }
  });

  console.log('🔌 WebSocket connection status:', isConnected ? 'Connected' : 'Disconnected');

  // Menu configurations
  const menusForSuperAdmin: MenuItem[] = useMemo(() => [
    { type: 'section', sectionLabel: 'Overview' },
    { icon: <Gauge className="w-4 h-4" />, label: 'Dashboard', path: '/dashboard' },
    { type: 'section', sectionLabel: 'Management' },
    { icon: <Users className="w-4 h-4" />, label: 'User Management', path: '/users' },
    { icon: <Trash2 className="w-4 h-4" />, label: 'Bin', path: '/bin' },
    { icon: <HatGlasses className="w-4 h-4" />, label: 'Audit Logs', path: '/audit-logs' },
    { type: 'section', sectionLabel: 'Integration' },
    { icon: <Unplug className="w-4 h-4" />, label: 'API Connect', path: '/connect' },
  ], []);

  const menusForAdmin: MenuItem[] = useMemo(() => [
    { type: 'section', sectionLabel: 'Management' },
    { icon: <Users className="w-4 h-4" />, label: 'User Management', path: '/users-admin' },
    { icon: <Shield className="w-4 h-4" />, label: 'System Settings', path: '/settings' },
  ], []);

  const menusForUser: MenuItem[] = useMemo(() => [
    { type: 'section', sectionLabel: 'Documents' },
    { icon: <Files className="w-4 h-4" />, label: 'My Documents', path: '/my-documents' },
    { icon: <Share2 className="w-4 h-4" />, label: 'Shared with Me', path: '/shared' },
    { icon: <Bell className="w-4 h-4" />, label: 'Notifications', path: '/notifications', badge: notificationCount > 0 ? notificationCount : null },
    { icon: <FileCheck className="w-4 h-4" />, label: 'My Signatures', path: '/signatures' },
    { icon: <Shield className="w-4 h-4" />, label: 'Certificates', path: '/certificates' },
    { type: 'divider' },
    { type: 'section', sectionLabel: 'Account' },
    { icon: <Lock className="w-4 h-4" />, label: 'My Profile', path: '/my-profile' },
  ], [notificationCount]);

  const getMenuItems = useCallback((): MenuItem[] => {
    const roles = user?.roles || [];
    if (roles.includes('ROLE_SUPERADMIN')) return menusForSuperAdmin;
    if (roles.includes('ROLE_ADMIN')) return menusForAdmin;
    return menusForUser;
  }, [user?.roles, menusForSuperAdmin, menusForAdmin, menusForUser]);

  const menuItems = getMenuItems();

  const toggleSubmenu = (label: string) => {
    if (isCollapsed && !isMobile) return;
    setOpenSubmenus(prev => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); } else { next.add(label); }
      return next;
    });
  };

  const isActive = (path?: string): boolean => {
    if (!path || path === '#') return false;
    return location.pathname === path;
  };

  const isChildActive = (children?: MenuItem[]): boolean =>
    children?.some(child => child.path && isActive(child.path)) ?? false;

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.children?.length) {
      toggleSubmenu(item.label || '');
    } else if (item.path && item.path !== '#') {
      navigate(item.path);
      if (isMobile) setIsMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getUserInitials = (): string => {
    if (!user?.username) return 'U';
    return user.username.trim().charAt(0).toUpperCase();
  };

  const getUserDisplayName = (): string => {
    if (!user?.username) return 'User';
    const username = user.username;
    if (username.includes('.')) {
      return username.split('.').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return username;
  };

  const showLabels = isMobile ? isMobileOpen : !isCollapsed;

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.type === 'divider') {
      return (
        <div
          key={`divider-${index}`}
          className="my-2 mx-2 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        />
      );
    }

    if (item.type === 'section') {
      if (!showLabels) return null;
      return (
        <div
          key={`section-${index}`}
          className="px-3 pt-4 pb-1 text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}
        >
          {item.sectionLabel}
        </div>
      );
    }

    const hasChildren = (item.children?.length ?? 0) > 0;
    const isItemActive = isActive(item.path);
    const hasActiveChild = isChildActive(item.children);
    const isSubmenuOpen = openSubmenus.has(item.label || '');
    const hasBadge = item.badge && item.badge > 0;

    return (
      <div key={item.label || index}>
        <button
          onClick={() => handleMenuItemClick(item)}
          title={!showLabels ? item.label : undefined}
          className={`
            w-full flex items-center gap-2.5 rounded-lg transition-all duration-150 text-left relative
            ${showLabels ? 'px-3 py-2' : 'justify-center px-0 py-2.5'}
            ${isItemActive || hasActiveChild
              ? 'text-white font-medium'
              : 'hover:text-white'
            }
          `}
          style={{
            color: isItemActive || hasActiveChild ? '#fff' : 'rgba(255,255,255,0.5)',
            background: isItemActive || hasActiveChild ? '#10B981' : 'transparent',
          }}
          onMouseEnter={e => {
            if (!isItemActive && !hasActiveChild) {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)';
            }
          }}
          onMouseLeave={e => {
            if (!isItemActive && !hasActiveChild) {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
            }
          }}
        >
          <div className="relative shrink-0">
            {item.icon}
            {hasBadge && !showLabels && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold animate-pulse">
                {(item.badge ?? 0) > 99 ? '99+' : item.badge}
              </span>
            )}
          </div>

          {showLabels && (
            <>
              <span className="flex-1 text-sm">{item.label}</span>
              {hasBadge && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none animate-pulse">
                  {(item.badge ?? 0) > 99 ? '99+' : item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-180' : ''}`}
                />
              )}
            </>
          )}
        </button>

        {showLabels && hasChildren && isSubmenuOpen && (
          <div className="ml-4 mt-0.5 mb-1 pl-3 border-l space-y-0.5" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {item.children?.map((child, ci) => (
              <button
                key={child.label || ci}
                onClick={() => {
                  if (child.path) navigate(child.path);
                  if (isMobile) setIsMobileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all"
                style={{
                  color: isActive(child.path) ? '#fff' : 'rgba(255,255,255,0.45)',
                  background: isActive(child.path) ? '#10B981' : 'transparent',
                }}
              >
                <span className="shrink-0">{child.icon}</span>
                <span>{child.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const sidebarWidth = isMobile
    ? (isMobileOpen ? 'w-60' : 'w-0')
    : (isCollapsed ? 'w-[60px]' : 'w-56');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* WebSocket Connection Status Indicator */}
      {/*!isFullScreen && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-2 py-1 rounded-full text-xs shadow-lg transition-all duration-300 ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-white animate-pulse' : 'bg-red-200'
          }`}></div>
          <span className="text-[10px] font-medium">
            {isConnected ? 'Live' : 'Reconnecting...'}
          </span>
        </div>
      )*/}

      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!isFullScreen && (
        <aside
          className={`
            ${sidebarWidth}
            flex flex-col transition-all duration-300 overflow-hidden
            fixed md:relative z-30 h-full
            ${isMobile && !isMobileOpen ? '-translate-x-full' : 'translate-x-0'}
          `}
          style={{ background: '#111827', minWidth: isMobile ? undefined : (isCollapsed ? '60px' : '224px') }}
        >
          {/* Logo row */}
          <div
            className="flex items-center gap-2.5 px-3 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <img
              src={`${import.meta.env.BASE_URL}new-logo.svg`}
              alt="new-logo.svg"
              width="40px"
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-opacity ${!isMobile && isCollapsed ? 'cursor-pointer hover:opacity-80' : ''}`}
              onClick={() => { if (!isMobile && isCollapsed) setIsCollapsed(false); }}
              title={!isMobile && isCollapsed ? 'Expand sidebar' : undefined}
            />

            {showLabels && (
              <div className="overflow-hidden flex-1">
                <div className="text-white text-sm font-semibold whitespace-nowrap">
                  {import.meta.env.VITE_APP_NAME || 'Invero'}
                </div>
                <div className="text-[10px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Version {import.meta.env.VITE_APP_VERSION || '1.0'}
                </div>
              </div>
            )}

            {/* Desktop collapse button */}
            {!isMobile && (
              <button
                onClick={() => setIsCollapsed(prev => !prev)}
                className="ml-auto p-1 rounded-md transition-colors flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}

            {/* Mobile close button */}
            {isMobile && isMobileOpen && (
              <button
                onClick={() => setIsMobileOpen(false)}
                className="ml-auto p-1 rounded-md transition-colors flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar">
            {menuItems.map((item, index) => renderMenuItem(item, index))}
          </nav>

          {/* Footer with user info and logout */}
          <div
            className="flex-shrink-0 p-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            {showLabels ? (
              <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ background: '#10B981' }}
                >
                  {getUserInitials()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium truncate text-white">{getUserDisplayName()}</div>
                  <div className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {user?.email || 'user@example.com'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-2 mb-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ background: '#10B981' }}
                >
                  {getUserInitials()}
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150
                ${!showLabels ? 'justify-center' : ''}
              `}
              style={{ color: 'rgba(255,255,255,0.4)', background: 'transparent' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
                (e.currentTarget as HTMLElement).style.color = '#EF4444';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
              }}
              title={!showLabels ? 'Sign out' : undefined}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {showLabels && <span>Sign out</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50 flex flex-col">
        {/* Mobile topbar */}
        {isMobile && (
          <div
            className="flex-shrink-0 flex items-center gap-3 px-4 h-12 bg-[#111827] border-b border-gray-100"
            style={{ position: 'sticky', top: 0, zIndex: 10 }}
          >
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 rounded-lg text-white hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white">
              {import.meta.env.VITE_APP_NAME || 'iPluma'}
            </span>
          </div>
        )}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;