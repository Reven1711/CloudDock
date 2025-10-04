import { Search, Bell, User, Upload, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTenant, tenantPresets } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const Header = () => {
  const { tenant, setTenant } = useTenant();
  const { user, signOut } = useAuth();
  return (
    <header className="h-16 glass-card border-b border-white/10 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search files, folders..."
            className="pl-10 glass-card border-primary/20 focus:border-primary/40 transition-colors"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 ml-6">
        <Select value={tenant.tenantId} onValueChange={(val) => {
          const next = tenantPresets.find(t => t.tenantId === val);
          if (next) setTenant(next);
        }}>
          <SelectTrigger className="w-[180px] glass-card">
            <SelectValue placeholder="Select Org" />
          </SelectTrigger>
          <SelectContent className="glass-card">
            {tenantPresets.map(preset => (
              <SelectItem key={preset.tenantId} value={preset.tenantId}>
                {preset.tenantId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="bg-gradient-primary hover:opacity-90 text-white shadow-primary transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>

        <Button variant="ghost" size="icon" className="relative hover:bg-white/10">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-white/10">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card">
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              {user?.name} ({user?.role})
            </div>
            <DropdownMenuItem onClick={signOut} className="cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
