import { useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';

// Convert hex to HSL
function hexToHSL(hex: string): string {
  // Remove the hash if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

export const ThemeApplier = () => {
  const { tenant } = useTenant();
  
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme (light/dark)
    if (tenant.branding.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply custom colors
    if (tenant.branding.primaryColor) {
      const primaryHSL = hexToHSL(tenant.branding.primaryColor);
      root.style.setProperty('--primary', primaryHSL);
      root.style.setProperty('--ring', primaryHSL);
      
      // Update gradient
      const secondaryHSL = tenant.branding.secondaryColor 
        ? hexToHSL(tenant.branding.secondaryColor) 
        : primaryHSL;
      root.style.setProperty('--gradient-primary', 
        `linear-gradient(135deg, hsl(${primaryHSL}), hsl(${secondaryHSL}))`
      );
    }
    
    if (tenant.branding.secondaryColor) {
      const secondaryHSL = hexToHSL(tenant.branding.secondaryColor);
      root.style.setProperty('--secondary', secondaryHSL);
    }
    
    if (tenant.branding.accentColor) {
      const accentHSL = hexToHSL(tenant.branding.accentColor);
      root.style.setProperty('--accent', accentHSL);
    }
    
    // Apply font family
    if (tenant.branding.fontFamily) {
      root.style.setProperty('font-family', tenant.branding.fontFamily);
      document.body.style.fontFamily = tenant.branding.fontFamily;
    }
    
  }, [tenant.branding]);
  
  return null; // This component doesn't render anything
};

