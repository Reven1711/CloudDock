import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, DollarSign, LogOut, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getAllConfigurations,
  updateConfiguration,
  platformAdminLogout,
  getPlatformAdminUser,
  verifyPlatformAdminToken,
} from '@/services/platformAdminService';

interface ConfigItem {
  key: string;
  value: any;
  description: string;
  category: string;
  updatedBy: string;
  updatedAt: string;
}

export const PlatformAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  // Verify admin access on mount
  useEffect(() => {
    const checkAccess = async () => {
      const user = getPlatformAdminUser();
      if (!user) {
        navigate('/platform-admin/login');
        return;
      }

      const verification = await verifyPlatformAdminToken();
      if (!verification.valid) {
        toast({
          title: 'Access denied',
          description: 'Your session has expired. Please login again.',
          variant: 'destructive',
        });
        platformAdminLogout();
        navigate('/platform-admin/login');
        return;
      }

      fetchConfigurations();
    };

    checkAccess();
  }, [navigate, toast]);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await getAllConfigurations();
      if (response.success) {
        setConfigs(response.configs);
        // Initialize edit values
        const initialValues: Record<string, any> = {};
        response.configs.forEach((config: ConfigItem) => {
          initialValues[config.key] = config.value;
        });
        setEditValues(initialValues);
      }
    } catch (error: any) {
      console.error('Failed to fetch configurations:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    try {
      setSaving(key);
      const config = configs.find((c) => c.key === key);
      if (!config) return;

      const response = await updateConfiguration(
        key,
        editValues[key],
        config.description,
        config.category
      );

      if (response.success) {
        toast({
          title: 'Configuration updated',
          description: `${key} has been updated successfully`,
        });
        setEditingKey(null);
        fetchConfigurations(); // Refresh to get updated values
      }
    } catch (error: any) {
      console.error('Failed to update configuration:', error);
      toast({
        title: 'Update failed',
        description: error.response?.data?.error || 'Failed to update configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const handleLogout = () => {
    platformAdminLogout();
    navigate('/platform-admin/login');
  };

  const pricingConfigs = configs.filter((c) => c.category === 'pricing');
  const limitConfigs = configs.filter((c) => c.category === 'limits');
  const otherConfigs = configs.filter((c) => !['pricing', 'limits'].includes(c.category));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading configurations...</p>
        </div>
      </div>
    );
  }

  const renderConfigItem = (config: ConfigItem) => {
    const isEditing = editingKey === config.key;
    const value = editValues[config.key];

    return (
      <div
        key={config.key}
        className="p-4 rounded-lg border border-primary/20 bg-background/50 space-y-3"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{config.key}</h3>
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
            {config.category}
          </span>
        </div>

        <div className="space-y-2">
          {isEditing ? (
            <>
              <Input
                type={typeof value === 'number' ? 'number' : 'text'}
                step={typeof value === 'number' ? '0.01' : undefined}
                value={value}
                onChange={(e) =>
                  setEditValues({
                    ...editValues,
                    [config.key]:
                      typeof value === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                  })
                }
                className="font-mono"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSave(config.key)}
                  disabled={saving === config.key}
                >
                  {saving === config.key ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingKey(null);
                    setEditValues({ ...editValues, [config.key]: config.value });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-2 rounded bg-muted font-mono text-lg font-semibold">
                {typeof value === 'number' ? value.toFixed(2) : String(value)}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingKey(config.key)}
                className="w-full"
              >
                Edit
              </Button>
            </>
          )}
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t border-primary/10">
          <p>Last updated: {new Date(config.updatedAt).toLocaleString()}</p>
          <p>Updated by: {config.updatedBy}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card p-6 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Platform Administration</h1>
                <p className="text-muted-foreground">Manage system-wide configurations</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Warning */}
        <div className="glass-card p-4 border-amber-500/30 bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-500">Important Notice</p>
              <p className="text-sm text-muted-foreground mt-1">
                Changes to pricing and limits affect all organizations. Please review carefully before
                saving.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Configurations */}
        <div className="glass-card p-6 border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Pricing Configurations</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pricingConfigs.map(renderConfigItem)}
          </div>
        </div>

        {/* Limits Configurations */}
        <div className="glass-card p-6 border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">System Limits</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {limitConfigs.map(renderConfigItem)}
          </div>
        </div>

        {/* Other Configurations */}
        {otherConfigs.length > 0 && (
          <div className="glass-card p-6 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold">Other Configurations</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {otherConfigs.map(renderConfigItem)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

