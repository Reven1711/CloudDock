import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { FileCard } from '@/components/dashboard/FileCard';
import { Grid, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';

const Dashboard = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { tenant } = useTenant();

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
        
        <main className="flex-1 overflow-y-auto p-6">
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

          {/* Files Header */}
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
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
