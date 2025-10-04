import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

const Admin = () => {
  const { user, approveUser, usage, refresh } = useAuth();
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mock-pending-users');
      const list = raw ? JSON.parse(raw) as any[] : [];
      setPending(list.filter(u => u.tenantId === user?.tenantId));
    } catch {}
  }, [user]);

  if (!user || user.role !== 'admin') return null;

  const quotaPct = useMemo(() => {
    if (!usage) return 0;
    return Math.min(100, Math.round((usage.usedBytes / usage.quotaBytes) * 100));
  }, [usage]);

  const approve = async (id: string) => {
    await approveUser(id);
    const raw = localStorage.getItem('mock-pending-users');
    const list = raw ? JSON.parse(raw) as any[] : [];
    setPending(list.filter(u => u.tenantId === user?.tenantId));
    refresh();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users and monitor usage</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">Storage Usage</h2>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${quotaPct}%` }}></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {((usage?.usedBytes || 0) / (1024*1024*1024)).toFixed(2)} GB used of 50 GB
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button onClick={() => (window.location.href = '/dashboard/settings')} variant="outline" className="glass-card border-primary/20 hover:border-primary/40">Customize UI</Button>
                <Button onClick={() => (window.location.href = '/dashboard')} className="bg-gradient-primary text-white">Go to Files</Button>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Pending User Approvals</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {pending.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-background">
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    <Button onClick={() => approve(u.id)} className="bg-gradient-primary text-white">Approve</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;


