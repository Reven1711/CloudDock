import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Lock, Mail, Building2, User as UserIcon, Factory } from 'lucide-react';
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
import { tenantPresets } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

const Auth = () => {
  const navigate = useNavigate();
  const { setTenant } = useTenant();
  const { signUpOrganization, signUpUser, user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isOrgSignup, setIsOrgSignup] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [orgSigninName, setOrgSigninName] = useState('');

  // In real app, fetch available tenants for the user or infer from subdomain
  const tenants = tenantPresets.map(p => ({ id: p.tenantId, name: p.tenantId }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOrgSignup) {
      if (!companyName || !name || !email || !password) return;
      const tenantId = companyName.trim().toLowerCase().replace(/\s+/g, '-');
      const admin = await signUpOrganization({ tenantId, companyName, adminName: name, adminEmail: email, password });
      const preset = tenantPresets.find(t => t.tenantId === tenantId) || tenantPresets[0];
      setTenant({ ...preset, tenantId, branding: { ...preset.branding } });
      navigate('/onboarding');
    } else if (!isLogin) {
      if (!selectedTenant || !name || !email || !password) return;
      await signUpUser({ tenantId: selectedTenant, name, email, password });
      const preset = tenantPresets.find(t => t.tenantId === selectedTenant);
      if (preset) setTenant(preset);
      navigate('/dashboard');
    } else {
      // Sign in: organization name + email + password
      if (!orgSigninName || !email || !password) return;
      const tenantId = orgSigninName.trim().toLowerCase().replace(/\s+/g, '-');
      const preset = tenantPresets.find(t => t.tenantId === tenantId) || tenantPresets[0];
      setTenant({ ...preset, tenantId, branding: { ...preset.branding } });
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
          {!isLogin && (
            <div className="mb-2 flex items-center gap-2">
              <Button variant={isOrgSignup ? 'default' : 'outline'} onClick={() => setIsOrgSignup(true)} className={isOrgSignup ? 'bg-gradient-primary text-white' : ''}>
                <Factory className="w-4 h-4 mr-2" /> Organization
              </Button>
              <Button variant={!isOrgSignup ? 'default' : 'outline'} onClick={() => setIsOrgSignup(false)} className={!isOrgSignup ? 'bg-gradient-primary text-white' : ''}>
                <UserIcon className="w-4 h-4 mr-2" /> User
              </Button>
            </div>
          )}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">
              {isLogin ? 'Sign in' : isOrgSignup ? 'Create organization' : 'Create user account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin ? 'Enter your organization, email and password' : isOrgSignup ? 'Set up your organization and admin' : 'Join an existing organization'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isOrgSignup && (
              <div className="space-y-2">
                <Label htmlFor="tenant" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Select Organization
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
            )}

            {isLogin && (
              <div className="space-y-2">
                <Label htmlFor="org" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Organization Name
                </Label>
                <Input
                  id="org"
                  type="text"
                  placeholder="Acme Corp"
                  value={orgSigninName}
                  onChange={(e) => setOrgSigninName(e.target.value)}
                  className="glass-card border-primary/20"
                  required
                />
              </div>
            )}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  {isOrgSignup ? 'Admin Name' : 'Full Name'}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-card border-primary/20"
                  required
                />
              </div>
            )}

            {/* Company Name */}
            {!isLogin && isOrgSignup && (
              <div className="space-y-2">
                <Label htmlFor="company" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Company Name
                </Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="glass-card border-primary/20"
                  required
                />
              </div>
            )}

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
