import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Lock, Mail, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenant } from '@/contexts/TenantContext';

const Auth = () => {
  const navigate = useNavigate();
  const { setTenant } = useTenant();
  const [isLogin, setIsLogin] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Mock tenant list - in real app, fetch from API
  const tenants = [
    { id: 'acme', name: 'Acme Corp' },
    { id: 'techstart', name: 'TechStart Inc' },
    { id: 'cloudflow', name: 'CloudFlow Solutions' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock authentication - in real app, call API
    if (selectedTenant && email && password) {
      // Navigate to dashboard
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      {/* Animated background circles */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="w-full max-w-md px-6 relative z-10 animate-fade-in">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4 shadow-primary">
            <Cloud className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Skyvault
          </h1>
          <p className="text-muted-foreground">
            Premium Multi-Tenant Cloud Storage
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-3xl p-8 shadow-glass">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin ? 'Sign in to your account' : 'Get started with Skyvault'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tenant Selection */}
            <div className="space-y-2">
              <Label htmlFor="tenant" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Select Tenant
              </Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                <SelectTrigger className="glass-card border-primary/20">
                  <SelectValue placeholder="Choose your organization" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-card border-primary/20"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-card border-primary/20"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-primary transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="font-semibold text-primary">
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
