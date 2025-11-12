import { FileCard } from '@/components/dashboard/FileCard';
import { Search, Upload, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Routes, Route, useNavigate } from 'react-router-dom';

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
  const { tenant, setTenant } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  // Load UI settings from backend
  useEffect(() => {
    const loadUISettings = async () => {
      if (!user?.tenantId) return;

      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/ui/${user.tenantId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            // Apply UI settings from backend
            setTenant({
              ...tenant,
              branding: {
                ...tenant.branding,
                primaryColor: data.settings.primaryColor || tenant.branding.primaryColor,
                secondaryColor: data.settings.secondaryColor || tenant.branding.secondaryColor,
                accentColor: data.settings.accentColor || tenant.branding.accentColor,
                theme: data.settings.theme || tenant.branding.theme,
                fontFamily: data.settings.fontFamily || tenant.branding.fontFamily,
              },
              dashboard: {
                ...tenant.dashboard,
                cardStyle: data.settings.cardStyle || tenant.dashboard.cardStyle,
                showAnalytics: data.settings.showAnalytics ?? tenant.dashboard.showAnalytics,
                showRecentFiles: data.settings.showRecentFiles ?? tenant.dashboard.showRecentFiles,
                fileViewLayout: data.settings.fileViewLayout || tenant.dashboard.fileViewLayout,
              },
            });
          }
        }
      } catch (error) {
        console.error('Failed to load UI settings:', error);
      }
    };

    loadUISettings();
  }, [user?.tenantId]);

  // Mock data
  const files = [
    { name: 'Project Proposal.pdf', size: '2.4 MB', date: 'Today', type: 'document' as const },
    { name: 'Design Mockups', size: '45 MB', date: 'Yesterday', type: 'folder' as const },
    { name: 'Team Photo.jpg', size: '1.8 MB', date: '2 days ago', type: 'image' as const, starred: true },
    { name: 'Marketing Video.mp4', size: '124 MB', date: 'Last week', type: 'video' as const },
    { name: 'Budget 2024.xlsx', size: '856 KB', date: 'Last week', type: 'document' as const },
    { name: 'Client Meeting.mp4', size: '89 MB', date: '2 weeks ago', type: 'video' as const },
  ];

  // Filter files based on search query
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: 'Total Storage', value: '500 GB', usage: '245 GB used' },
    { label: 'Total Files', value: '1,234', usage: '89 folders' },
    { label: 'Shared Files', value: '156', usage: '23 with you' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      {/* Organization Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {user?.tenantId?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.tenantId?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
              <p className="text-sm text-muted-foreground">My Dashboard</p>
            </div>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="glass-card border-primary/20"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
        
      <main className="max-w-7xl mx-auto p-6">
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

          {/* Approval Notice for pending users */}
          {!user?.approved && (
            <div className="glass-card rounded-2xl p-4 mb-4">
              <p className="text-sm text-muted-foreground">Your account is pending admin approval. You can browse but uploading is disabled.</p>
            </div>
          )}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold mb-1">My Files</h2>
                        <p className="text-sm text-muted-foreground">
                          Access and manage your files
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Search Bar */}
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search files and folders..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full glass-card border-primary/20 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="glass-card border-primary/20 hover:border-primary/40"
                        >
                          <FolderPlus className="w-4 h-4 mr-2" />
                          New Folder
                        </Button>
                        <Button className="bg-gradient-primary text-white">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Files Display */}
                  {tenant.dashboard.showRecentFiles && (
                    <>
                      {/* Large Icons View */}
                      {tenant.dashboard.fileViewLayout === 'large-icons' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {filteredFiles.map((file, index) => (
                            <div
                              key={index}
                              className="glass-card border-primary/20 p-6 rounded-lg hover:scale-105 transition-transform animate-scale-in"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex flex-col items-center text-center space-y-3">
                                <div className="text-6xl">{file.type === 'folder' ? '📁' : file.type === 'image' ? '🖼️' : '📄'}</div>
                                <div className="w-full">
                                  <h4 className="font-semibold truncate">{file.name}</h4>
                                  <p className="text-sm text-muted-foreground">{file.size}</p>
                                  <p className="text-xs text-muted-foreground">{file.date}</p>
                                  {file.starred && <span className="text-yellow-500 text-xl">⭐</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* List View */}
                      {tenant.dashboard.fileViewLayout === 'list' && (
                        <div className="space-y-2">
                          {filteredFiles.map((file, index) => (
                            <div
                              key={index}
                              className="glass-card border-primary/20 p-3 rounded-lg flex items-center gap-4 hover:bg-primary/5 transition-colors animate-scale-in"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="text-2xl">{file.type === 'folder' ? '📁' : file.type === 'image' ? '🖼️' : '📄'}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{file.name}</h4>
                              </div>
                              {file.starred && <span className="text-yellow-500">⭐</span>}
                              <div className="text-sm text-muted-foreground">{file.size}</div>
                              <div className="text-sm text-muted-foreground w-24">{file.date}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Details View */}
                      {tenant.dashboard.fileViewLayout === 'details' && (
                        <div className="glass-card border-primary/20 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-primary/10 border-b border-primary/20">
                              <tr>
                                <th className="text-left p-3 font-semibold">Name</th>
                                <th className="text-left p-3 font-semibold">Type</th>
                                <th className="text-left p-3 font-semibold">Size</th>
                                <th className="text-left p-3 font-semibold">Date</th>
                                <th className="text-left p-3 font-semibold">Starred</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredFiles.map((file, index) => (
                                <tr
                                  key={index}
                                  className={`border-b border-primary/10 hover:bg-primary/5 transition-colors animate-scale-in ${
                                    index % 2 === 0 ? 'bg-background/50' : ''
                                  }`}
                                  style={{ animationDelay: `${index * 50}ms` }}
                                >
                                  <td className="p-3 flex items-center gap-3">
                                    <span className="text-xl">{file.type === 'folder' ? '📁' : file.type === 'image' ? '🖼️' : '📄'}</span>
                                    <span className="font-medium">{file.name}</span>
                                  </td>
                                  <td className="p-3 text-sm text-muted-foreground capitalize">{file.type}</td>
                                  <td className="p-3 text-sm text-muted-foreground">{file.size}</td>
                                  <td className="p-3 text-sm text-muted-foreground">{file.date}</td>
                                  <td className="p-3">{file.starred && <span className="text-yellow-500 text-xl">⭐</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tiles View */}
                      {tenant.dashboard.fileViewLayout === 'tiles' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {filteredFiles.map((file, index) => (
                            <div
                              key={index}
                              className="glass-card border-primary/20 p-4 rounded-lg hover:shadow-lg transition-shadow animate-scale-in"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="text-4xl mb-3">{file.type === 'folder' ? '📁' : file.type === 'image' ? '🖼️' : '📄'}</div>
                              <h4 className="font-semibold text-sm truncate mb-1">{file.name}</h4>
                              <p className="text-xs text-muted-foreground">{file.size}</p>
                              <p className="text-xs text-muted-foreground">{file.date}</p>
                              {file.starred && <span className="text-yellow-500 text-lg mt-2 inline-block">⭐</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                </div>
              }
            />
            <Route path="/settings" element={<Settings />} />
          </Routes>
      </main>
    </div>
  );
};

export default Dashboard;
