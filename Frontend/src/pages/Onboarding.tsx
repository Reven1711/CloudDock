import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant, setTenant } = useTenant();
  const [primaryColor, setPrimaryColor] = useState(tenant.branding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(tenant.branding.secondaryColor);
  const [theme, setTheme] = useState<'light' | 'dark'>(tenant.branding.theme);

  const save = () => {
    setTenant({
      ...tenant,
      branding: { ...tenant.branding, primaryColor, secondaryColor, theme },
    });
    navigate('/admin');
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Customize your organization</h1>
        <div className="glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
        <div className="flex gap-3">
          <Button onClick={save} className="bg-gradient-primary text-white">Continue to Admin</Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;


