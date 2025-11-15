import { FileCard } from '@/components/dashboard/FileCard';
import { Search, Upload, FolderPlus, LogOut, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { FileUploadDialog } from '@/components/FileUploadDialog';
import { StorageQuotaCard } from '@/components/StorageQuotaCard';
import { FolderDialog } from '@/components/FolderDialog';
import {
  getOrganizationFiles,
  getFileDownloadUrl,
  deleteFile,
  formatFileSize,
  getFileIcon,
  formatRelativeTime,
  FileMetadata,
} from '@/services/fileService';
import { useToast } from '@/hooks/use-toast';

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
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState('/'); // Track current folder path
  const [folderHistory, setFolderHistory] = useState<string[]>(['/']); // For breadcrumb navigation

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  // Fetch files from API
  const fetchFiles = async (folder: string = currentFolder) => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      const response = await getOrganizationFiles(user.tenantId, folder, 1, 100);
      setFiles(response.files);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      toast({
        title: "Failed to load files",
        description: "Could not retrieve your files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
    fetchFiles();
  }, [user?.tenantId]);

  // Handle file download
  const handleDownload = async (fileId: string, fileName: string) => {
    if (!user?.tenantId) return;

    try {
      const downloadUrl = await getFileDownloadUrl(fileId, user.tenantId);
      // Open URL in new tab
      window.open(downloadUrl, '_blank');
      
      toast({
        title: "Download started",
        description: `Downloading ${fileName}...`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "Could not download file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle file deletion
  const handleDelete = async (fileId: string, fileName: string) => {
    if (!user?.tenantId || !user?.id) return;

    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      await deleteFile(fileId, user.tenantId, user.id);
      toast({
        title: "File deleted",
        description: `${fileName} has been deleted successfully.`,
      });
      // Refresh file list
      fetchFiles();
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle upload success
  const handleUploadSuccess = () => {
    fetchFiles();
  };

  // Handle folder creation
  const handleFolderCreate = (folderName: string) => {
    // Refresh the file list to show the new folder
    fetchFiles(currentFolder);
  };

  // Navigate into a folder
  const handleFolderClick = (file: FileMetadata) => {
    if (file.mimeType === 'application/vnd.clouddock.folder') {
      const newPath = currentFolder === '/' 
        ? `/${file.originalName}/` 
        : `${currentFolder}${file.originalName}/`;
      
      setCurrentFolder(newPath);
      setFolderHistory([...folderHistory, newPath]);
      fetchFiles(newPath);
    }
  };

  // Navigate to a specific folder from breadcrumb
  const navigateToFolder = (path: string) => {
    setCurrentFolder(path);
    const index = folderHistory.indexOf(path);
    if (index !== -1) {
      setFolderHistory(folderHistory.slice(0, index + 1));
    }
    fetchFiles(path);
  };

  // Filter files based on search query
  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

                    {/* Breadcrumb Navigation */}
                    {currentFolder !== '/' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <button
                          onClick={() => navigateToFolder('/')}
                          className="hover:text-primary transition-colors"
                        >
                          🏠 Home
                        </button>
                        {currentFolder.split('/').filter(Boolean).map((folder, index, arr) => {
                          const path = '/' + arr.slice(0, index + 1).join('/') + '/';
                          return (
                            <div key={path} className="flex items-center gap-2">
                              <span>/</span>
                              {index === arr.length - 1 ? (
                                <span className="font-medium text-foreground">📁 {folder}</span>
                              ) : (
                                <button
                                  onClick={() => navigateToFolder(path)}
                                  className="hover:text-primary transition-colors"
                                >
                                  📁 {folder}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

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
                          disabled={!user?.approved}
                          onClick={() => setFolderDialogOpen(true)}
                        >
                          <FolderPlus className="w-4 h-4 mr-2" />
                          New Folder
                        </Button>
                        <Button 
                          className="bg-gradient-primary text-white"
                          onClick={() => setUploadDialogOpen(true)}
                          disabled={!user?.approved}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Storage Quota Card */}
                  {user?.tenantId && (
                    <div className="mb-6">
                      <StorageQuotaCard orgId={user.tenantId} />
                    </div>
                  )}

                  {/* Files Display */}
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Loading files...</p>
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="text-center py-12 glass-card rounded-lg border-primary/20">
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No files found matching your search.' : 'No files yet. Upload your first file to get started!'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Large Icons View */}
                      {tenant.dashboard.fileViewLayout === 'large-icons' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                              {filteredFiles.map((file, index) => (
                                <div
                                  key={file.fileId}
                                  className={`glass-card border-primary/20 p-6 rounded-lg hover:scale-105 transition-transform animate-scale-in group ${
                                    file.mimeType === 'application/vnd.clouddock.folder' ? 'cursor-pointer' : ''
                                  }`}
                                  style={{ animationDelay: `${index * 50}ms` }}
                                  onClick={() => file.mimeType === 'application/vnd.clouddock.folder' && handleFolderClick(file)}
                                >
                                  <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="text-6xl">{getFileIcon(file.mimeType)}</div>
                                    <div className="w-full">
                                      <h4 className="font-semibold truncate">{file.originalName}</h4>
                                      <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                                      <p className="text-xs text-muted-foreground">{formatRelativeTime(file.uploadedAt)}</p>
                                    </div>
                                    {/* Action Buttons - Only for files, not folders */}
                                    {file.mimeType !== 'application/vnd.clouddock.folder' && (
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
                                            handleDelete(file.fileId, file.originalName);
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    )}
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
                              key={file.fileId}
                              className={`glass-card border-primary/20 p-3 rounded-lg flex items-center gap-4 hover:bg-primary/5 transition-colors animate-scale-in group ${
                                file.mimeType === 'application/vnd.clouddock.folder' ? 'cursor-pointer' : ''
                              }`}
                              style={{ animationDelay: `${index * 50}ms` }}
                              onClick={() => file.mimeType === 'application/vnd.clouddock.folder' && handleFolderClick(file)}
                            >
                              <div className="text-2xl">{getFileIcon(file.mimeType)}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{file.originalName}</h4>
                              </div>
                              <div className="text-sm text-muted-foreground">{formatFileSize(file.size)}</div>
                              <div className="text-sm text-muted-foreground w-24">{formatRelativeTime(file.uploadedAt)}</div>
                              {file.mimeType !== 'application/vnd.clouddock.folder' && (
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
                                      handleDelete(file.fileId, file.originalName);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
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
                                <th className="text-left p-3 font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredFiles.map((file, index) => (
                                <tr
                                  key={file.fileId}
                                  className={`border-b border-primary/10 hover:bg-primary/5 transition-colors animate-scale-in ${
                                    index % 2 === 0 ? 'bg-background/50' : ''
                                  } ${file.mimeType === 'application/vnd.clouddock.folder' ? 'cursor-pointer' : ''}`}
                                  style={{ animationDelay: `${index * 50}ms` }}
                                  onClick={() => file.mimeType === 'application/vnd.clouddock.folder' && handleFolderClick(file)}
                                >
                                      <td className="p-3 flex items-center gap-3">
                                        <span className="text-xl">{getFileIcon(file.mimeType)}</span>
                                        <span className="font-medium">{file.originalName}</span>
                                      </td>
                                      <td className="p-3 text-sm text-muted-foreground">{formatFileSize(file.size)}</td>
                                      <td className="p-3 text-sm text-muted-foreground">{formatRelativeTime(file.uploadedAt)}</td>
                                      <td className="p-3">
                                        {file.mimeType !== 'application/vnd.clouddock.folder' ? (
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
                                                handleDelete(file.fileId, file.originalName);
                                              }}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">Click to open</span>
                                        )}
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
                          {filteredFiles.map((file, index) => (
                            <div
                              key={file.fileId}
                              className={`glass-card border-primary/20 p-4 rounded-lg hover:shadow-lg transition-shadow animate-scale-in group ${
                                file.mimeType === 'application/vnd.clouddock.folder' ? 'cursor-pointer' : ''
                              }`}
                              style={{ animationDelay: `${index * 50}ms` }}
                              onClick={() => file.mimeType === 'application/vnd.clouddock.folder' && handleFolderClick(file)}
                            >
                              <div className="text-4xl mb-3">{getFileIcon(file.mimeType)}</div>
                              <h4 className="font-semibold text-sm truncate mb-1">{file.originalName}</h4>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(file.uploadedAt)}</p>
                              {/* Action Buttons - Only for files */}
                              {file.mimeType !== 'application/vnd.clouddock.folder' && (
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
                                      handleDelete(file.fileId, file.originalName);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
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

      {/* File Upload Dialog */}
      <FileUploadDialog
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        currentFolder={currentFolder}
      />

      {/* Folder Creation Dialog */}
      <FolderDialog
        isOpen={folderDialogOpen}
        onClose={() => setFolderDialogOpen(false)}
        onCreateSuccess={handleFolderCreate}
        currentFolder={currentFolder}
      />
    </div>
  );
};

export default Dashboard;
