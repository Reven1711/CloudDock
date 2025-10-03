import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { FileCard } from '@/components/dashboard/FileCard';
import { Grid, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Routes, Route } from 'react-router-dom';

const Settings = () => {
  const { tenant, setTenant } = useTenant();
  const [primaryColor, setPrimaryColor] = useState(tenant.branding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(tenant.branding.secondaryColor);
  const [theme, setTheme] = useState<'light' | 'dark'>(tenant.branding.theme);
  const [fontFamily, setFontFamily] = useState(tenant.branding.fontFamily);
  const [cardStyle, setCardStyle] = useState<'glassmorphism' | 'neumorphism'>(tenant.dashboard.cardStyle);
  const [showAnalytics, setShowAnalytics] = useState(tenant.dashboard.showAnalytics);
  const [showRecentFiles, setShowRecentFiles] = useState(tenant.dashboard.showRecentFiles);

  const applyChanges = () => {
    setTenant({
      ...tenant,
      branding: { ...tenant.branding, primaryColor, secondaryColor, theme, fontFamily },
      dashboard: { ...tenant.dashboard, cardStyle, showAnalytics, showRecentFiles },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Tenant Settings</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold mb-2">Branding</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Primary Color</label>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full h-10 rounded-md bg-transparent" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Secondary Color</label>
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-full h-10 rounded-md bg-transparent" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Theme</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')} className="w-full h-10 rounded-md glass-card px-3">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Font Family</label>
              <input value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full h-10 rounded-md glass-card px-3" placeholder="e.g., Inter, sans-serif" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold mb-2">Dashboard</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Card Style</label>
              <select value={cardStyle} onChange={(e) => setCardStyle(e.target.value as 'glassmorphism' | 'neumorphism')} className="w-full h-10 rounded-md glass-card px-3">
                <option value="glassmorphism">Glassmorphism</option>
                <option value="neumorphism">Neumorphism</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input id="analytics" type="checkbox" checked={showAnalytics} onChange={(e) => setShowAnalytics(e.target.checked)} />
              <label htmlFor="analytics" className="text-sm">Show Analytics</label>
            </div>
            <div className="flex items-center gap-2">
              <input id="recent" type="checkbox" checked={showRecentFiles} onChange={(e) => setShowRecentFiles(e.target.checked)} />
              <label htmlFor="recent" className="text-sm">Show Recent Files</label>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={applyChanges} className="bg-gradient-primary text-white">Save Changes</Button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { tenant } = useTenant();
  const { user } = useAuth();

  // Mock data
  const files = [
    { name: 'Project Proposal.pdf', size: '2.4 MB', date: 'Today', type: 'document' as const },
    { name: 'Design Mockups', size: '45 MB', date: 'Yesterday', type: 'folder' as const },
    { name: 'Team Photo.jpg', size: '1.8 MB', date: '2 days ago', type: 'image' as const, starred: true },
    { name: 'Marketing Video.mp4', size: '124 MB', date: 'Last week', type: 'video' as const },
    { name: 'Budget 2024.xlsx', size: '856 KB', date: 'Last week', type: 'document' as const },
    { name: 'Client Meeting.mp4', size: '89 MB', date: '2 weeks ago', type: 'video' as const },
  ];

  const stats = [
    { label: 'Total Storage', value: '500 GB', usage: '245 GB used' },
    { label: 'Total Files', value: '1,234', usage: '89 folders' },
    { label: 'Shared Files', value: '156', usage: '23 with you' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-0">
          <Routes>
            <Route
              path="/"
              element={
                <div className="p-6">
                  {/* Stats */}
                  {tenant.dashboard.showAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
                    {stats.map((stat, index) => (
                      <div
                        key={index}
                        className={tenant.dashboard.cardStyle === 'neumorphism' ? 'neumorphic-card rounded-2xl p-6 hover-lift' : 'glass-card rounded-2xl p-6 hover-lift'}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          {stat.label}
                        </h3>
                        <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">
                          {stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground">{stat.usage}</p>
                      </div>
                    ))}
                  </div>
                  )}

          {/* Files Header and Approval Notice */}
          {!user?.approved && (
            <div className="glass-card rounded-2xl p-4 mb-4">
              <p className="text-sm text-muted-foreground">Your account is pending admin approval. You can browse but uploading is disabled.</p>
            </div>
          )}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">My Files</h2>
                      <p className="text-sm text-muted-foreground">
                        Access and manage your files
                      </p>
                    </div>

                    {/* View Toggle */}
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                      <TabsList className="glass-card">
                        <TabsTrigger value="grid" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                          <LayoutGrid className="w-4 h-4" />
                        </TabsTrigger>
                        <TabsTrigger value="list" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                          <List className="w-4 h-4" />
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Files Grid */}
                  {tenant.dashboard.showRecentFiles && (
                  <div className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                      : 'space-y-2'
                  }>
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="animate-scale-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <FileCard {...file} />
                      </div>
                    ))}
                  </div>
                  )}

                  {/* Quick Actions */}
                  <div className="mt-8 glass-card rounded-2xl p-6">
                    <h3 className="font-semibold mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button variant="outline" className="glass-card border-primary/20 hover:border-primary/40 justify-start">
                        Create New Folder
                      </Button>
                      <Button variant="outline" className="glass-card border-primary/20 hover:border-primary/40 justify-start">
                        Share Files
                      </Button>
                      <Button variant="outline" className="glass-card border-primary/20 hover:border-primary/40 justify-start">
                        Request Files
                      </Button>
                    </div>
                  </div>
                </div>
              }
            />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
