import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TenantConfig {
  tenantId: string;
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    theme: 'light' | 'dark';
    fontFamily: string;
  };
  navbar: {
    background: string;
    textColor: string;
  };
  sidebar: {
    background: string;
    textColor: string;
    hoverColor: string;
  };
  dashboard: {
    cardStyle: 'glassmorphism' | 'neumorphism';
    showAnalytics: boolean;
    showRecentFiles: boolean;
    fileViewLayout: 'large-icons' | 'list' | 'details' | 'tiles';
  };
  features: {
    darkModeEnabled: boolean;
    multiLanguage: string[];
    allowPublicSharing: boolean;
  };
}

const defaultTenant: TenantConfig = {
  tenantId: 'default',
  branding: {
    logoUrl: '/assets/logos/skyvault.png',
    primaryColor: '#8B5CF6',
    secondaryColor: '#3B82F6',
    theme: 'light',
    fontFamily: 'Inter, sans-serif',
  },
  navbar: {
    background: '#8B5CF6',
    textColor: '#ffffff',
  },
  sidebar: {
    background: '#f8f9fa',
    textColor: '#333333',
    hoverColor: '#e6e6e6',
  },
  dashboard: {
    cardStyle: 'glassmorphism',
    showAnalytics: true,
    showRecentFiles: true,
    fileViewLayout: 'large-icons',
  },
  features: {
    darkModeEnabled: true,
    multiLanguage: ['en', 'hi'],
    allowPublicSharing: true,
  },
};

const blueOceanTenant: TenantConfig = {
  tenantId: 'blue-ocean',
  branding: {
    logoUrl: '/assets/logos/blue-ocean.png',
    primaryColor: '#0EA5E9',
    secondaryColor: '#22D3EE',
    theme: 'light',
    fontFamily: 'Poppins, Inter, sans-serif',
  },
  navbar: {
    background: '#0EA5E9',
    textColor: '#ffffff',
  },
  sidebar: {
    background: '#F0F9FF',
    textColor: '#0C4A6E',
    hoverColor: '#E0F2FE',
  },
  dashboard: {
    cardStyle: 'glassmorphism',
    showAnalytics: true,
    showRecentFiles: false,
    fileViewLayout: 'tiles',
  },
  features: {
    darkModeEnabled: false,
    multiLanguage: ['en'],
    allowPublicSharing: true,
  },
};

const noirTenant: TenantConfig = {
  tenantId: 'noir',
  branding: {
    logoUrl: '/assets/logos/noir.png',
    primaryColor: '#111827',
    secondaryColor: '#6B7280',
    theme: 'dark',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  navbar: {
    background: '#111827',
    textColor: '#F9FAFB',
  },
  sidebar: {
    background: '#0B1220',
    textColor: '#E5E7EB',
    hoverColor: '#111827',
  },
  dashboard: {
    cardStyle: 'neumorphism',
    showAnalytics: true,
    showRecentFiles: true,
    fileViewLayout: 'list',
  },
  features: {
    darkModeEnabled: true,
    multiLanguage: ['en'],
    allowPublicSharing: false,
  },
};

export const tenantPresets: TenantConfig[] = [defaultTenant, blueOceanTenant, noirTenant];

interface TenantContextType {
  tenant: TenantConfig;
  setTenant: (tenant: TenantConfig) => void;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantConfig>(defaultTenant);
  const [isLoading, setIsLoading] = useState(false);

  // Load tenant from localStorage on first mount
  useEffect(() => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem('tenant-config');
      if (stored) {
        const parsed = JSON.parse(stored) as TenantConfig;
        if (parsed && parsed.tenantId) {
          setTenant(parsed);
        }
      } else {
        const storedId = localStorage.getItem('tenant-id');
        if (storedId) {
          const fromPreset = tenantPresets.find(t => t.tenantId === storedId);
          if (fromPreset) setTenant(fromPreset);
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Apply tenant theme colors, gradients, theme class, and font as CSS variables
    const root = document.documentElement;

    const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
      const value = hex.replace('#', '');
      const bigint = parseInt(value.length === 3 ? value.split('').map(c => c + c).join('') : value, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const rNorm = r / 255;
      const gNorm = g / 255;
      const bNorm = b / 255;
      const max = Math.max(rNorm, gNorm, bNorm);
      const min = Math.min(rNorm, gNorm, bNorm);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      const d = max - min;
      if (d !== 0) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm:
            h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
            break;
          case gNorm:
            h = (bNorm - rNorm) / d + 2;
            break;
          case bNorm:
            h = (rNorm - gNorm) / d + 4;
            break;
        }
        h /= 6;
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    const primary = hexToHsl(tenant.branding.primaryColor);
    const secondary = hexToHsl(tenant.branding.secondaryColor);

    root.style.setProperty('--primary', `${primary.h} ${primary.s}% ${primary.l}%`);
    root.style.setProperty('--secondary', `${secondary.h} ${secondary.s}% ${secondary.l}%`);

    root.style.setProperty(
      '--gradient-primary',
      `linear-gradient(135deg, hsl(${primary.h} ${primary.s}% ${primary.l}%), hsl(${secondary.h} ${secondary.s}% ${secondary.l}%))`
    );

    // Switch theme
    if (tenant.branding.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply font family
    document.body.style.fontFamily = tenant.branding.fontFamily;
    // Persist tenant to localStorage
    try {
      localStorage.setItem('tenant-config', JSON.stringify(tenant));
      localStorage.setItem('tenant-id', tenant.tenantId);
    } catch {
      // ignore quota errors
    }
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant, setTenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
