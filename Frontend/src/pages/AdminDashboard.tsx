import { useState, useEffect } from 'react';
// Removed Sidebar and Header - using custom organization header
import { FileCard } from '@/components/dashboard/FileCard';
import { StorageUpgradeDialog } from '@/components/StorageUpgradeDialog';
import { Users, HardDrive, Settings, Eye, Palette, Layout, CheckCircle, XCircle, Clock, LogOut, Download, Trash2, ArrowUpCircle } from 'lucide-react';
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
import {
  getOrganizationFiles,
  getAllOrganizationFilesForAdmin,
  getStorageInfo,
  getFileDownloadUrl,
  deleteFile,
  deleteFolder,
  downloadFolderAsZip,
  formatFileSize,
  getFileIcon,
  formatRelativeTime,
  FileMetadata,
  StorageInfo,
} from '@/services/fileService';
import { getStoragePurchaseHistory } from '@/services/billingService';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
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
  const [storageData, setStorageData] = useState<StorageInfo | null>(null);

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

  // Files state
  const [allFiles, setAllFiles] = useState<FileMetadata[]>([]);
  const [filesByUser, setFilesByUser] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('/');
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Users state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Storage upgrade dialog state
  const [storageUpgradeOpen, setStorageUpgradeOpen] = useState(false);
  
  // Purchase history state
  const [latestPurchase, setLatestPurchase] = useState<any>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    
    // Fetch organization-wide data
    fetchOrgStats();
    fetchAllOrgFiles();
    fetchUISettings();
    fetchAllUsers();
    fetchLatestPurchase();
  }, [user?.tenantId]);

  const fetchOrgStats = async () => {
    if (!user?.tenantId) return;
    
    try {
      console.log('🔄 Fetching storage info for orgId:', user.tenantId);
      const storage = await getStorageInfo(user.tenantId);
      console.log('📊 Storage info received:', storage);
      console.log('   - Total Quota (bytes):', storage.totalQuota);
      console.log('   - Total Quota (GB):', (storage.totalQuota / (1024 * 1024 * 1024)).toFixed(2));
      console.log('   - Used Storage:', storage.usedStorage);
      setStorageData(storage);
    } catch (error) {
      console.error('Failed to fetch org stats:', error);
      toast({
        title: "Failed to load storage data",
        description: "Could not retrieve storage information.",
        variant: "destructive",
      });
    }
  };

  const fetchLatestPurchase = async () => {
    if (!user?.tenantId) return;
    
    try {
      const response = await getStoragePurchaseHistory(user.tenantId);
      if (response.success && response.purchases && response.purchases.length > 0) {
        // Get the most recent completed purchase
        const completed = response.purchases.find((p: any) => p.status === 'completed');
        setLatestPurchase(completed || null);
      }
    } catch (error) {
      console.error('Failed to fetch purchase history:', error);
    }
  };

  const fetchAllOrgFiles = async (folder: string = '/') => {
    if (!user?.tenantId) return;
    
    try {
      setLoadingFiles(true);
      // 🔓 Admin can see ALL files grouped by users (with folder structure)
      const response = await getAllOrganizationFilesForAdmin(user.tenantId, folder, 1, 100);
      
      // Set files grouped by users
      setFilesByUser(response.users);
      setCurrentFolder(response.currentFolder || '/');
      
      // Also flatten to allFiles for backward compatibility
      const flatFiles: FileMetadata[] = [];
      const flatFolders: FileMetadata[] = [];
      response.users.forEach((userGroup: any) => {
        if (userGroup.files) flatFiles.push(...userGroup.files);
        if (userGroup.folders) flatFolders.push(...userGroup.folders);
      });
      setAllFiles([...flatFolders, ...flatFiles]); // Folders first, then files
    } catch (error) {
      console.error('Failed to fetch org files:', error);
      toast({
        title: "Failed to load files",
        description: "Could not retrieve organization files.",
        variant: "destructive",
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  // Navigate to folder
  const handleFolderClick = (folderName: string, parentFolder: string) => {
    const newFolderPath = parentFolder === '/' ? `/${folderName}/` : `${parentFolder}${folderName}/`;
    fetchAllOrgFiles(newFolderPath);
  };

  // Go back to parent folder
  const handleBackClick = () => {
    if (currentFolder === '/') return;
    
    const pathParts = currentFolder.split('/').filter(Boolean);
    pathParts.pop(); // Remove last folder
    const parentPath = pathParts.length > 0 ? `/${pathParts.join('/')}/` : '/';
    fetchAllOrgFiles(parentPath);
  };

  // Handle file download
  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const downloadUrl = await getFileDownloadUrl(fileId, user?.tenantId || '');
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: `Downloading ${fileName}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Could not download the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle file delete
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      await deleteFile(fileId, user?.tenantId || '', user?.id || '');
      
      toast({
        title: "File deleted",
        description: `${fileName} has been deleted successfully.`,
      });

      // Refresh the file list
      fetchAllOrgFiles(currentFolder);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle folder delete
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    const confirmed = confirm(
      `⚠️ Delete folder "${folderName}"?\n\n` +
      `This will delete:\n` +
      `• The folder\n` +
      `• All files inside\n` +
      `• All subfolders and their contents\n\n` +
      `This action cannot be undone!`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      await deleteFolder(folderId, user?.tenantId || '', user?.id || '');
      
      toast({
        title: "Folder deleted",
        description: `${folderName} and all its contents have been deleted successfully.`,
      });

      // Refresh the file list
      fetchAllOrgFiles(currentFolder);
    } catch (error) {
      console.error('Delete folder error:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete the folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle folder download as ZIP
  const handleDownloadFolder = async (folderId: string, folderName: string) => {
    try {
      toast({
        title: "Preparing download...",
        description: `Creating ZIP archive for "${folderName}"`,
      });

      // Admin can download any folder - don't pass userId to see all files
      await downloadFolderAsZip(folderId, folderName, user?.tenantId || '', undefined);
      
      toast({
        title: "Download started",
        description: `${folderName}.zip is being downloaded.`,
      });
    } catch (error) {
      console.error('Download folder error:', error);
      toast({
        title: "Download failed",
        description: "Could not download the folder. Please try again.",
        variant: "destructive",
      });
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
        
        // Show success toast
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

  const storagePercentage = storageData ? storageData.usagePercentage : 0;
  const storageFree = storageData ? storageData.availableStorage : 0;

  // Show loading if user data not yet available
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
              onClick={signOut}
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
                      {allUsers.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {allUsers.filter(u => u.status === 'pending').length} pending approval
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {storageData?.fileCount || 0}
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
                      {storageData ? formatFileSize(storageData.usedStorage) : '0 B'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      of {storageData ? formatFileSize(storageData.totalQuota) : '0 B'}
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{storageData ? formatFileSize(storageData.usedStorage) : '0 B'} used</span>
                        <span className="font-semibold">{storageData ? formatFileSize(storageData.totalQuota) : '0 B'} total</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-gradient-primary transition-all duration-500"
                          style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-start text-xs text-muted-foreground">
                        <div>
                          {storagePercentage > 90 && '⚠️ Storage almost full! '}
                          {storagePercentage > 80 && storagePercentage <= 90 && '⚠️ Storage getting full. '}
                          {storagePercentage < 80 && `${(100 - storagePercentage).toFixed(0)}% available`}
                        </div>
                        {latestPurchase && latestPurchase.expiresAt && (
                          <div className="text-right">
                            <div className="font-medium text-primary">
                              +{latestPurchase.storageGB} GB purchased
                            </div>
                            <div className="text-xs">
                              Expires: {new Date(latestPurchase.expiresAt).toLocaleDateString()}
                              <span className="block">
                                ({Math.ceil((new Date(latestPurchase.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => setStorageUpgradeOpen(true)}
                      className="w-full gap-2"
                      variant="default"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      Upgrade Storage
                    </Button>
                  </div>
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
                  {loadingFiles ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Loading files...</p>
                    </div>
                  ) : filesByUser.length === 0 ? (
                    <div className="text-center py-12 glass-card rounded-lg border-primary/20">
                      <p className="text-muted-foreground">No files uploaded yet by any users.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Breadcrumb Navigation */}
                      <div className="flex items-center gap-2 text-sm mb-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => fetchAllOrgFiles('/')}
                          disabled={currentFolder === '/'}
                        >
                          🏠 Root
                        </Button>
                        {currentFolder !== '/' && (
                          <>
                            {currentFolder.split('/').filter(Boolean).map((folder, index, arr) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-muted-foreground">/</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    const path = '/' + arr.slice(0, index + 1).join('/') + '/';
                                    fetchAllOrgFiles(path);
                                  }}
                                  className="text-primary"
                                >
                                  📁 {folder}
                                </Button>
                              </div>
                            ))}
                          </>
                        )}
                        {currentFolder !== '/' && (
                          <Button variant="outline" size="sm" onClick={handleBackClick}>
                            ← Back
                          </Button>
                        )}
                      </div>

                      {filesByUser.map((userGroup) => (
                        <div key={userGroup.userId} className="glass-card border-primary/20 p-6 rounded-lg">
                          {/* User Header */}
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-primary/20">
                            <div>
                              <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                {userGroup.userName}
                              </h3>
                              <p className="text-sm text-muted-foreground">{userGroup.userEmail}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {userGroup.fileCount} files {userGroup.folderCount > 0 && `• ${userGroup.folderCount} folders`}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(userGroup.totalSize)}</p>
                            </div>
                          </div>

                          {/* User's Folders and Files */}
                          {(userGroup.folders?.length === 0 && userGroup.files?.length === 0) ? (
                            <p className="text-center text-muted-foreground py-4">No files in this folder</p>
                          ) : (
                    <>
                      {/* Large Icons View */}
                      {tenant.dashboard.fileViewLayout === 'large-icons' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Folders First */}
                          {userGroup.folders?.map((folder: FileMetadata) => (
                            <div 
                              key={folder.fileId} 
                              className="glass-card border-primary/20 p-6 rounded-lg hover:scale-105 transition-transform cursor-pointer group relative"
                              onClick={() => handleFolderClick(folder.fileName, folder.folder)}
                            >
                              <div className="flex flex-col items-center text-center space-y-3">
                                <div className="text-6xl">📁</div>
                                <div className="w-full">
                                  <h4 className="font-semibold truncate">{folder.originalName}</h4>
                                  <p className="text-sm text-muted-foreground">{formatFileSize(folder.size)}</p>
                                  <p className="text-xs text-muted-foreground">{formatRelativeTime(folder.uploadedAt)}</p>
                                  <p className="text-xs text-primary mt-2">Folder</p>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadFolder(folder.fileId, folder.originalName);
                                    }}
                                    title="Download as ZIP"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFolder(folder.fileId, folder.originalName);
                                    }}
                                    title="Delete folder"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Then Files */}
                          {userGroup.files?.map((file: FileMetadata) => (
                            <div key={file.fileId} className="glass-card border-primary/20 p-6 rounded-lg hover:scale-105 transition-transform group">
                              <div className="flex flex-col items-center text-center space-y-3">
                                <div className="text-6xl">{getFileIcon(file.mimeType)}</div>
                                <div className="w-full">
                                  <h4 className="font-semibold truncate">{file.originalName}</h4>
                                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                                  <p className="text-xs text-muted-foreground">{formatRelativeTime(file.uploadedAt)}</p>
                                  <p className="text-xs text-primary mt-2">Owner: {file.uploadedBy.userName}</p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(file.fileId, file.originalName);
                                    }}
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFile(file.fileId, file.originalName);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* List View */}
                      {tenant.dashboard.fileViewLayout === 'list' && (
                        <div className="space-y-2">
                          {/* Folders First */}
                          {userGroup.folders?.map((folder: FileMetadata) => (
                            <div 
                              key={folder.fileId} 
                              className="glass-card border-primary/20 p-3 rounded-lg flex items-center gap-4 hover:bg-primary/5 transition-colors cursor-pointer group"
                              onClick={() => handleFolderClick(folder.fileName, folder.folder)}
                            >
                              <div className="text-2xl">📁</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{folder.originalName}</h4>
                              </div>
                              <div className="text-sm text-muted-foreground">{formatFileSize(folder.size)}</div>
                              <div className="text-sm text-muted-foreground w-24">{formatRelativeTime(folder.uploadedAt)}</div>
                              <div className="text-xs text-primary w-32">Folder</div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFolder(folder.fileId, folder.originalName);
                                  }}
                                  title="Download as ZIP"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(folder.fileId, folder.originalName);
                                  }}
                                  title="Delete folder"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {/* Then Files */}
                          {userGroup.files?.map((file: FileMetadata) => (
                            <div key={file.fileId} className="glass-card border-primary/20 p-3 rounded-lg flex items-center gap-4 hover:bg-primary/5 transition-colors group">
                              <div className="text-2xl">{getFileIcon(file.mimeType)}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{file.originalName}</h4>
                              </div>
                              <div className="text-sm text-muted-foreground">{formatFileSize(file.size)}</div>
                              <div className="text-sm text-muted-foreground w-24">{formatRelativeTime(file.uploadedAt)}</div>
                              <div className="text-xs text-primary w-32 truncate">{file.uploadedBy.userName}</div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(file.fileId, file.originalName);
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(file.fileId, file.originalName);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
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
                                <th className="text-left p-3 font-semibold">Size</th>
                                <th className="text-left p-3 font-semibold">Date</th>
                                <th className="text-left p-3 font-semibold">Owner</th>
                                <th className="text-left p-3 font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Folders First */}
                              {userGroup.folders?.map((folder: FileMetadata, index: number) => (
                                <tr 
                                  key={folder.fileId} 
                                  className={`border-b border-primary/10 hover:bg-primary/5 transition-colors cursor-pointer group ${index % 2 === 0 ? 'bg-background/50' : ''}`}
                                  onClick={() => handleFolderClick(folder.fileName, folder.folder)}
                                >
                                  <td className="p-3 flex items-center gap-3">
                                    <span className="text-xl">📁</span>
                                    <span className="font-medium">{folder.originalName}</span>
                                  </td>
                                  <td className="p-3 text-sm text-muted-foreground">{formatFileSize(folder.size)}</td>
                                  <td className="p-3 text-sm text-muted-foreground">{formatRelativeTime(folder.uploadedAt)}</td>
                                  <td className="p-3 text-sm text-primary">Folder</td>
                                  <td className="p-3">
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadFolder(folder.fileId, folder.originalName);
                                        }}
                                        title="Download as ZIP"
                                      >
                                        <Download className="w-3 h-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteFolder(folder.fileId, folder.originalName);
                                        }}
                                        title="Delete folder"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              
                              {/* Then Files */}
                              {userGroup.files?.map((file: FileMetadata, index: number) => (
                                <tr key={file.fileId} className={`border-b border-primary/10 hover:bg-primary/5 transition-colors ${index % 2 === 0 ? 'bg-background/50' : ''}`}>
                                  <td className="p-3 flex items-center gap-3">
                                    <span className="text-xl">{getFileIcon(file.mimeType)}</span>
                                    <span className="font-medium">{file.originalName}</span>
                                  </td>
                                  <td className="p-3 text-sm text-muted-foreground">{formatFileSize(file.size)}</td>
                                  <td className="p-3 text-sm text-muted-foreground">{formatRelativeTime(file.uploadedAt)}</td>
                                  <td className="p-3 text-sm text-primary">{file.uploadedBy.userName}</td>
                                  <td className="p-3">
                                    <div className="flex gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownload(file.fileId, file.originalName);
                                        }}
                                      >
                                        <Download className="w-3 h-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteFile(file.fileId, file.originalName);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tiles View */}
                      {tenant.dashboard.fileViewLayout === 'tiles' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {/* Folders First */}
                          {userGroup.folders?.map((folder: FileMetadata) => (
                            <div 
                              key={folder.fileId} 
                              className="glass-card border-primary/20 p-4 rounded-lg hover:shadow-lg transition-shadow cursor-pointer group relative"
                              onClick={() => handleFolderClick(folder.fileName, folder.folder)}
                            >
                              <div className="text-4xl mb-3">📁</div>
                              <h4 className="font-semibold text-sm truncate mb-1">{folder.originalName}</h4>
                              <p className="text-xs text-muted-foreground">{formatFileSize(folder.size)}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(folder.uploadedAt)}</p>
                              <p className="text-xs text-primary mt-1">Folder</p>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFolder(folder.fileId, folder.originalName);
                                  }}
                                  title="Download as ZIP"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(folder.fileId, folder.originalName);
                                  }}
                                  title="Delete folder"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {/* Then Files */}
                          {userGroup.files?.map((file: FileMetadata) => (
                            <div key={file.fileId} className="glass-card border-primary/20 p-4 rounded-lg hover:shadow-lg transition-shadow group">
                              <div className="text-4xl mb-3">{getFileIcon(file.mimeType)}</div>
                              <h4 className="font-semibold text-sm truncate mb-1">{file.originalName}</h4>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(file.uploadedAt)}</p>
                              <p className="text-xs text-primary mt-2 truncate">By: {file.uploadedBy.userName}</p>
                              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(file.fileId, file.originalName);
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(file.fileId, file.originalName);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                          )}
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
                        fileViewLayout: 'large-icons',
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

      {/* Storage Upgrade Dialog */}
      <StorageUpgradeDialog
        isOpen={storageUpgradeOpen}
        onClose={() => {
          setStorageUpgradeOpen(false);
          // Refresh storage data after dialog closes
          fetchOrgStats();
        }}
        orgId={user?.tenantId || ''}
        currentQuota={storageData?.totalQuota ? storageData.totalQuota / (1024 * 1024 * 1024) : 50}
      />
    </div>
  );
};

export default AdminDashboard;

