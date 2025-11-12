import { useState, useEffect } from 'react';
// Removed Sidebar and Header - using custom organization header
import { FileCard } from '@/components/dashboard/FileCard';
import { Users, HardDrive, Settings, Eye, Palette, Layout, CheckCircle, XCircle, Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { tenant, setTenant } = useTenant();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not admin
  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Organization stats
  const [orgStats, setOrgStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    totalFiles: 0,
    storageUsed: 0,
    storageQuota: 50 * 1024 * 1024 * 1024, // 50 GB in bytes
  });

  // UI Customization state
  const [uiSettings, setUiSettings] = useState({
    primaryColor: tenant.branding.primaryColor || '#6366f1',
    secondaryColor: tenant.branding.secondaryColor || '#8b5cf6',
    accentColor: tenant.branding.accentColor || '#ec4899',
    theme: tenant.branding.theme || 'dark',
    fontFamily: tenant.branding.fontFamily || 'Inter, sans-serif',
    cardStyle: tenant.dashboard.cardStyle || 'glassmorphism',
    showAnalytics: tenant.dashboard.showAnalytics !== false,
    showRecentFiles: tenant.dashboard.showRecentFiles !== false,
    fileViewLayout: tenant.dashboard.fileViewLayout || 'large-icons' as 'large-icons' | 'list' | 'details' | 'tiles',
  });

  // Mock all files from organization
  const [allFiles, setAllFiles] = useState([
    { id: 1, name: 'Q4 Report.pdf', size: '2.4 MB', date: 'Today', type: 'document' as const, owner: 'john@acme.com' },
    { id: 2, name: 'Team Presentation', size: '45 MB', date: 'Yesterday', type: 'folder' as const, owner: 'jane@acme.com' },
    { id: 3, name: 'Product Demo.mp4', size: '124 MB', date: '2 days ago', type: 'video' as const, owner: 'bob@acme.com' },
    { id: 4, name: 'Client Proposal.docx', size: '856 KB', date: 'Last week', type: 'document' as const, owner: 'alice@acme.com' },
  ]);

  // Users state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    // Fetch organization-wide data
    fetchOrgStats();
    fetchAllOrgFiles();
    fetchUISettings();
    fetchAllUsers();
  }, [user]);

  const fetchOrgStats = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      // TODO: Replace with actual API call
      // const response = await fetch(`${apiUrl}/org/${user?.tenantId}/stats`);
      // const data = await response.json();
      // setOrgStats(data);
      
      // Mock data for now
      setOrgStats({
        totalUsers: 12,
        pendingUsers: 3,
        totalFiles: 234,
        storageUsed: 24.5 * 1024 * 1024 * 1024, // 24.5 GB
        storageQuota: 50 * 1024 * 1024 * 1024, // 50 GB
      });
    } catch (error) {
      console.error('Failed to fetch org stats:', error);
    }
  };

  const fetchAllOrgFiles = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      // TODO: Replace with actual API call
      // const response = await fetch(`${apiUrl}/files/org/${user?.tenantId}`);
      // const data = await response.json();
      // setAllFiles(data.files);
    } catch (error) {
      console.error('Failed to fetch org files:', error);
    }
  };

  const fetchUISettings = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/ui/${user?.tenantId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setUiSettings({ ...uiSettings, ...data.settings });
        }
      }
    } catch (error) {
      console.error('Failed to fetch UI settings:', error);
    }
  };

  const fetchAllUsers = async () => {
    if (!user?.tenantId) {
      console.log('No tenantId available:', user);
      return;
    }
    
    try {
      setLoadingUsers(true);
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const url = `${apiUrl}/users/org/${user.tenantId}`;
      console.log('Fetching users from:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        setAllUsers(data.users || []);
        
        // Update org stats with real user counts
        const pendingCount = (data.users || []).filter((u: any) => u.status === 'pending').length;
        setOrgStats((prev) => ({
          ...prev,
          totalUsers: (data.users || []).length,
          pendingUsers: pendingCount,
        }));
        
        toast({
          title: "Users Loaded",
          description: `Found ${(data.users || []).length} users in your organization`,
        });
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch users:', errorData);
        toast({
          title: "Failed to Load Users",
          description: errorData.error || "Could not load users",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: "Error Loading Users",
        description: "Please check if backend services are running",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/users/${userId}/approve`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: "User Approved! ✅",
          description: "The user can now access all features.",
        });
        // Refresh users list
        fetchAllUsers();
      } else {
        const error = await response.json();
        toast({
          title: "Approval Failed",
          description: error.error || "Failed to approve user",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user? This will remove them from the system.')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/users/${userId}/reject`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: "User Rejected",
          description: "The user has been removed from the system.",
        });
        // Refresh users list
        fetchAllUsers();
      } else {
        const error = await response.json();
        toast({
          title: "Rejection Failed",
          description: error.error || "Failed to reject user",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  const saveUISettings = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/ui/${user?.tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: uiSettings }),
      });

      if (response.ok) {
        // Update local tenant context
        setTenant({
          ...tenant,
          branding: {
            ...tenant.branding,
            primaryColor: uiSettings.primaryColor,
            secondaryColor: uiSettings.secondaryColor,
            accentColor: uiSettings.accentColor,
            theme: uiSettings.theme,
            fontFamily: uiSettings.fontFamily,
          },
          dashboard: {
            ...tenant.dashboard,
            cardStyle: uiSettings.cardStyle,
            showAnalytics: uiSettings.showAnalytics,
            showRecentFiles: uiSettings.showRecentFiles,
            fileViewLayout: uiSettings.fileViewLayout,
          },
        });

        toast({
          title: "UI Settings Saved! 🎨",
          description: "All users will see the new design on their next page load.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Save Failed",
          description: error.error || "Failed to save UI settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to save UI settings:', error);
      toast({
        title: "Error",
        description: "Failed to save UI settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const storagePercentage = (orgStats.storageUsed / orgStats.storageQuota) * 100;
  const storageFree = orgStats.storageQuota - orgStats.storageUsed;

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
              <p className="text-sm text-muted-foreground">Organization Dashboard</p>
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
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your organization, users, and customize the user experience
          </p>
        </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="glass-card">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                <Eye className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                <HardDrive className="w-4 h-4 mr-2" />
                All Files
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="customize" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                <Palette className="w-4 h-4 mr-2" />
                Customize UI
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-card border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {orgStats.totalUsers}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {orgStats.pendingUsers} pending approval
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {orgStats.totalFiles}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across all users
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Storage Used</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {(orgStats.storageUsed / (1024 * 1024 * 1024)).toFixed(1)} GB
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      of {(orgStats.storageQuota / (1024 * 1024 * 1024)).toFixed(0)} GB
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Storage Free</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {(storageFree / (1024 * 1024 * 1024)).toFixed(1)} GB
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(100 - storagePercentage).toFixed(1)}% available
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Storage Progress */}
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle>Organization Storage</CardTitle>
                  <CardDescription>
                    Track your organization's storage usage across all users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{(orgStats.storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB used</span>
                      <span>{(orgStats.storageQuota / (1024 * 1024 * 1024)).toFixed(0)} GB total</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary transition-all duration-500"
                        style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {storagePercentage > 90 && '⚠️ Storage almost full! '}
                      {storagePercentage > 80 && storagePercentage <= 90 && '⚠️ Storage getting full. '}
                      Free tier includes 50 GB per organization.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button 
                    variant="outline" 
                    className="justify-start glass-card border-primary/20 hover:border-primary/40"
                    onClick={() => navigate('/admin/users')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start glass-card border-primary/20 hover:border-primary/40"
                  >
                    <HardDrive className="w-4 h-4 mr-2" />
                    View All Files
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start glass-card border-primary/20 hover:border-primary/40"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Organization Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Files Tab */}
            <TabsContent value="files" className="space-y-4">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle>All Organization Files</CardTitle>
                  <CardDescription>
                    View and manage files uploaded by all users in your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Large Icons View */}
                  {tenant.dashboard.fileViewLayout === 'large-icons' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allFiles.map((file) => (
                        <div key={file.id} className="glass-card border-primary/20 p-6 rounded-lg hover:scale-105 transition-transform">
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div className="text-6xl">{file.type === 'folder' ? '📁' : file.type === 'image' ? '🖼️' : '📄'}</div>
                            <div className="w-full">
                              <h4 className="font-semibold truncate">{file.name}</h4>
                              <p className="text-sm text-muted-foreground">{file.size}</p>
                              <p className="text-xs text-muted-foreground">{file.date}</p>
                              <p className="text-xs text-primary mt-2">Owner: {file.owner}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* List View */}
                  {tenant.dashboard.fileViewLayout === 'list' && (
                    <div className="space-y-2">
                      {allFiles.map((file) => (
                        <div key={file.id} className="glass-card border-primary/20 p-3 rounded-lg flex items-center gap-4 hover:bg-primary/5 transition-colors">
                          <div className="text-2xl">{file.type === 'folder' ? '📁' : file.type === 'image' ? '🖼️' : '📄'}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{file.name}</h4>
                          </div>
                          <div className="text-sm text-muted-foreground">{file.size}</div>
                          <div className="text-sm text-muted-foreground w-24">{file.date}</div>
                          <div className="text-xs text-primary w-32 truncate">{file.owner}</div>
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
                            <th className="text-left p-3 font-semibold">Owner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allFiles.map((file, index) => (
                            <tr key={file.id} className={`border-b border-primary/10 hover:bg-primary/5 transition-colors ${index % 2 === 0 ? 'bg-background/50' : ''}`}>
                              <td className="p-3 flex items-center gap-3">
                                <span className="text-xl">{file.type === 'folder' ? '📁' : file.type === 'image' ? '🖼️' : '📄'}</span>
                                <span className="font-medium">{file.name}</span>
                              </td>
                              <td className="p-3 text-sm text-muted-foreground capitalize">{file.type}</td>
                              <td className="p-3 text-sm text-muted-foreground">{file.size}</td>
                              <td className="p-3 text-sm text-muted-foreground">{file.date}</td>
                              <td className="p-3 text-sm text-primary">{file.owner}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tiles View */}
                  {tenant.dashboard.fileViewLayout === 'tiles' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {allFiles.map((file) => (
                        <div key={file.id} className="glass-card border-primary/20 p-4 rounded-lg hover:shadow-lg transition-shadow">
                          <div className="text-4xl mb-3">{file.type === 'folder' ? '📁' : file.type === 'image' ? '🖼️' : '📄'}</div>
                          <h4 className="font-semibold text-sm truncate mb-1">{file.name}</h4>
                          <p className="text-xs text-muted-foreground">{file.size}</p>
                          <p className="text-xs text-muted-foreground">{file.date}</p>
                          <p className="text-xs text-primary mt-2 truncate">By: {file.owner}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage user access and approvals for your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading users...</p>
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Pending Users Section */}
                      {allUsers.filter((u) => u.status === 'pending').length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-yellow-500" />
                            Pending Approvals ({allUsers.filter((u) => u.status === 'pending').length})
                          </h3>
                          <div className="space-y-2">
                            {allUsers
                              .filter((u) => u.status === 'pending')
                              .map((user) => (
                                <div
                                  key={user.userId}
                                  className="flex items-center justify-between p-4 glass-card border-primary/20 rounded-lg hover:border-primary/40 transition-colors"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold">{user.name}</h4>
                                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                        Pending
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Requested: {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleApproveUser(user.userId)}
                                      className="bg-green-500 hover:bg-green-600 text-white"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRejectUser(user.userId)}
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Active Users Section */}
                      {allUsers.filter((u) => u.status === 'active').length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Active Users ({allUsers.filter((u) => u.status === 'active').length})
                          </h3>
                          <div className="space-y-2">
                            {allUsers
                              .filter((u) => u.status === 'active')
                              .map((user) => (
                                <div
                                  key={user.userId}
                                  className="flex items-center justify-between p-4 glass-card border-primary/20 rounded-lg"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold">{user.name}</h4>
                                      {user.role === 'admin' && (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                          Admin
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                        Active
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customize UI Tab */}
            <TabsContent value="customize" className="space-y-6">
              <Card className="glass-card border-primary/20">
                <CardHeader>
                  <CardTitle>Customize User Interface</CardTitle>
                  <CardDescription>
                    Personalize the look and feel for all users in your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Colors */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Brand Colors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={uiSettings.primaryColor}
                            onChange={(e) => setUiSettings({ ...uiSettings, primaryColor: e.target.value })}
                            className="w-20 h-10 cursor-pointer"
                          />
                          <Input
                            value={uiSettings.primaryColor}
                            onChange={(e) => setUiSettings({ ...uiSettings, primaryColor: e.target.value })}
                            className="flex-1 glass-card border-primary/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="secondaryColor">Secondary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="secondaryColor"
                            type="color"
                            value={uiSettings.secondaryColor}
                            onChange={(e) => setUiSettings({ ...uiSettings, secondaryColor: e.target.value })}
                            className="w-20 h-10 cursor-pointer"
                          />
                          <Input
                            value={uiSettings.secondaryColor}
                            onChange={(e) => setUiSettings({ ...uiSettings, secondaryColor: e.target.value })}
                            className="flex-1 glass-card border-primary/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accentColor">Accent Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="accentColor"
                            type="color"
                            value={uiSettings.accentColor}
                            onChange={(e) => setUiSettings({ ...uiSettings, accentColor: e.target.value })}
                            className="w-20 h-10 cursor-pointer"
                          />
                          <Input
                            value={uiSettings.accentColor}
                            onChange={(e) => setUiSettings({ ...uiSettings, accentColor: e.target.value })}
                            className="flex-1 glass-card border-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Theme & Typography */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Theme & Typography</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <Select 
                          value={uiSettings.theme} 
                          onValueChange={(value) => setUiSettings({ ...uiSettings, theme: value as 'light' | 'dark' })}
                        >
                          <SelectTrigger className="glass-card border-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fontFamily">Font Family</Label>
                        <Select 
                          value={uiSettings.fontFamily} 
                          onValueChange={(value) => setUiSettings({ ...uiSettings, fontFamily: value })}
                        >
                          <SelectTrigger className="glass-card border-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            <SelectItem value="Inter, sans-serif" style={{ fontFamily: 'Inter, sans-serif' }}>
                              Inter (Modern & Clean)
                            </SelectItem>
                            <SelectItem value="'Poppins', sans-serif" style={{ fontFamily: "'Poppins', sans-serif" }}>
                              Poppins (Geometric & Friendly)
                            </SelectItem>
                            <SelectItem value="'Roboto', sans-serif" style={{ fontFamily: "'Roboto', sans-serif" }}>
                              Roboto (Material Design)
                            </SelectItem>
                            <SelectItem value="'Open Sans', sans-serif" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                              Open Sans (Neutral & Professional)
                            </SelectItem>
                            <SelectItem value="'Montserrat', sans-serif" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                              Montserrat (Bold & Strong)
                            </SelectItem>
                            <SelectItem value="'Lato', sans-serif" style={{ fontFamily: "'Lato', sans-serif" }}>
                              Lato (Elegant & Warm)
                            </SelectItem>
                            <SelectItem value="'Nunito', sans-serif" style={{ fontFamily: "'Nunito', sans-serif" }}>
                              Nunito (Rounded & Soft)
                            </SelectItem>
                            <SelectItem value="'Raleway', sans-serif" style={{ fontFamily: "'Raleway', sans-serif" }}>
                              Raleway (Elegant & Minimal)
                            </SelectItem>
                            <SelectItem value="'Outfit', sans-serif" style={{ fontFamily: "'Outfit', sans-serif" }}>
                              Outfit (Contemporary)
                            </SelectItem>
                            <SelectItem value="'Plus Jakarta Sans', sans-serif" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              Plus Jakarta Sans (Tech & Modern)
                            </SelectItem>
                            <SelectItem value="'Space Grotesk', sans-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                              Space Grotesk (Futuristic)
                            </SelectItem>
                            <SelectItem value="'DM Sans', sans-serif" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              DM Sans (Versatile & Clear)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choose from curated Google Fonts that work great for web apps
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Settings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Dashboard Layout</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardStyle">Card Style</Label>
                        <Select 
                          value={uiSettings.cardStyle} 
                          onValueChange={(value) => setUiSettings({ ...uiSettings, cardStyle: value as 'glassmorphism' | 'neumorphism' })}
                        >
                          <SelectTrigger className="glass-card border-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            <SelectItem value="glassmorphism">Glassmorphism (Modern)</SelectItem>
                            <SelectItem value="neumorphism">Neumorphism (Soft)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fileViewLayout">File View Layout</Label>
                        <Select 
                          value={uiSettings.fileViewLayout} 
                          onValueChange={(value) => setUiSettings({ ...uiSettings, fileViewLayout: value as 'large-icons' | 'list' | 'details' | 'tiles' })}
                        >
                          <SelectTrigger className="glass-card border-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            <SelectItem value="large-icons">
                              <div className="flex items-center gap-2">
                                <Layout className="w-4 h-4" />
                                Large Icons (Visual)
                              </div>
                            </SelectItem>
                            <SelectItem value="list">
                              <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4 rotate-90" />
                                List View (Compact)
                              </div>
                            </SelectItem>
                            <SelectItem value="details">
                              <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Details View (Information-Rich)
                              </div>
                            </SelectItem>
                            <SelectItem value="tiles">
                              <div className="flex items-center gap-2">
                                <Layout className="w-4 h-4 rotate-45" />
                                Tiles (Grid)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choose how files will be displayed in user dashboards
                        </p>
                      </div>

                      <div className="flex items-center justify-between glass-card border-primary/20 p-4 rounded-lg">
                        <div className="space-y-0.5">
                          <Label htmlFor="showAnalytics">Show Analytics</Label>
                          <p className="text-sm text-muted-foreground">
                            Display statistics on user dashboard
                          </p>
                        </div>
                        <Switch
                          id="showAnalytics"
                          checked={uiSettings.showAnalytics}
                          onCheckedChange={(checked) => setUiSettings({ ...uiSettings, showAnalytics: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between glass-card border-primary/20 p-4 rounded-lg">
                        <div className="space-y-0.5">
                          <Label htmlFor="showRecentFiles">Show Recent Files</Label>
                          <p className="text-sm text-muted-foreground">
                            Display recent files section
                          </p>
                        </div>
                        <Switch
                          id="showRecentFiles"
                          checked={uiSettings.showRecentFiles}
                          onCheckedChange={(checked) => setUiSettings({ ...uiSettings, showRecentFiles: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Preview</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Temporarily apply settings for preview
                          setTenant({
                            ...tenant,
                            branding: {
                              ...tenant.branding,
                              primaryColor: uiSettings.primaryColor,
                              secondaryColor: uiSettings.secondaryColor,
                              accentColor: uiSettings.accentColor,
                              theme: uiSettings.theme,
                              fontFamily: uiSettings.fontFamily,
                            },
                            dashboard: {
                              ...tenant.dashboard,
                              cardStyle: uiSettings.cardStyle,
                              showAnalytics: uiSettings.showAnalytics,
                              showRecentFiles: uiSettings.showRecentFiles,
                              fileViewLayout: uiSettings.fileViewLayout,
                            },
                          });
                          toast({
                            title: "Preview Applied! 👁️",
                            description: "You're seeing the changes now. Save to make them permanent.",
                          });
                        }}
                        className="glass-card border-primary/20"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Now
                      </Button>
                    </div>
                    <div 
                      className="glass-card border-primary/20 p-6 rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, ${uiSettings.primaryColor}22, ${uiSettings.secondaryColor}22)`,
                        fontFamily: uiSettings.fontFamily,
                      }}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div 
                          className="w-12 h-12 rounded-full"
                          style={{ background: `linear-gradient(135deg, ${uiSettings.primaryColor}, ${uiSettings.secondaryColor})` }}
                        />
                        <div style={{ fontFamily: uiSettings.fontFamily }}>
                          <h4 className="font-semibold">Sample Dashboard Card</h4>
                          <p className="text-sm text-muted-foreground">
                            This is how your users will see content
                          </p>
                        </div>
                      </div>
                      <Button 
                        style={{ 
                          background: `linear-gradient(135deg, ${uiSettings.primaryColor}, ${uiSettings.secondaryColor})`,
                          color: 'white',
                          fontFamily: uiSettings.fontFamily,
                        }}
                      >
                        Sample Button
                      </Button>
                      <div className="mt-4 p-3 rounded" style={{ 
                        backgroundColor: `${uiSettings.accentColor}22`,
                        borderLeft: `4px solid ${uiSettings.accentColor}`,
                        fontFamily: uiSettings.fontFamily,
                      }}>
                        <p className="text-sm">Accent color example - notifications and alerts</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Click "Preview Now" to see changes applied across the entire admin dashboard
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={saveUISettings}
                      className="bg-gradient-primary text-white"
                    >
                      <Layout className="w-4 h-4 mr-2" />
                      Save & Apply to All Users
                    </Button>
                    <Button 
                      variant="outline"
                      className="glass-card border-primary/20"
                      onClick={() => setUiSettings({
                        primaryColor: '#6366f1',
                        secondaryColor: '#8b5cf6',
                        accentColor: '#ec4899',
                        theme: 'dark',
                        fontFamily: 'Inter, sans-serif',
                        cardStyle: 'glassmorphism',
                        showAnalytics: true,
                        showRecentFiles: true,
                        fileViewDefault: 'grid',
                      })}
                    >
                      Reset to Default
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;

