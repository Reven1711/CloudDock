import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { platformAdminLogin } from '@/services/platformAdminService';

export const PlatformAdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await platformAdminLogin(email, password);
      
      if (response.success) {
        toast({
          title: 'Login successful',
          description: 'Welcome, Platform Administrator',
        });
        navigate('/platform-admin/dashboard');
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Platform admin login error:', error);
      toast({
        title: 'Login failed',
        description: error.response?.data?.error || error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 space-y-6 border-primary/20">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Lock className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Platform Admin</h1>
            </div>
            <p className="text-muted-foreground">
              CloudDock Platform Administration
            </p>
            <div className="flex items-center gap-2 justify-center text-xs text-amber-500 bg-amber-500/10 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>Restricted Access - Platform Administrators Only</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@clouddock.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login as Platform Admin'}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-primary/20">
            <p>This is separate from organization admin accounts.</p>
            <p>Only CloudDock platform administrators can access this area.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

