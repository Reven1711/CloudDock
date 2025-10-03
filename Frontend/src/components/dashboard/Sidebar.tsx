import { NavLink } from 'react-router-dom';
import {
  Cloud,
  Home,
  FolderOpen,
  Share2,
  Clock,
  Star,
  Trash2,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

const navigationItems = [
  { name: 'Dashboard', icon: Home, path: '/dashboard' },
  { name: 'My Files', icon: FolderOpen, path: '/dashboard/files' },
  { name: 'Shared with Me', icon: Share2, path: '/dashboard/shared' },
  { name: 'Recent', icon: Clock, path: '/dashboard/recent' },
  { name: 'Favorites', icon: Star, path: '/dashboard/favorites' },
  { name: 'Trash', icon: Trash2, path: '/dashboard/trash' },
];

const bottomItems = [
  { name: 'Team', icon: Users, path: '/dashboard/team' },
  { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
];

export const Sidebar = () => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  return (
    <aside
      className="w-64 h-screen glass-card border-r border-white/10 flex flex-col"
      style={{
        background: tenant.sidebar.background,
        color: tenant.sidebar.textColor,
      }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-primary overflow-hidden">
            {tenant.branding.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <Cloud className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg" style={{ color: tenant.navbar.textColor }}>
              {tenant.tenantId}
            </h1>
            <p className="text-xs text-muted-foreground">Cloud Storage</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                'hover:bg-white/10 hover:shadow-md',
                isActive
                  ? 'bg-gradient-primary text-white shadow-primary'
                  : 'text-foreground/70 hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('w-5 h-5', isActive && 'text-white')} />
                <span className="font-medium">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Items */}
      <div className="p-4 border-t border-white/10 space-y-1">
        {bottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                'hover:bg-white/10',
                isActive
                  ? 'bg-white/10 text-foreground'
                  : 'text-foreground/70 hover:text-foreground'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                'hover:bg-white/10',
                isActive
                  ? 'bg-white/10 text-foreground'
                  : 'text-foreground/70 hover:text-foreground'
              )
            }
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Admin</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};
