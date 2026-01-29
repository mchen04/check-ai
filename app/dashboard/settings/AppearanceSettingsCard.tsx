'use client';

import { useTheme } from 'next-themes';
import { Palette, Monitor, Sun, Moon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Theme options hoisted outside component (rendering-hoist-jsx)
const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function AppearanceSettingsCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Use resolvedTheme for display but theme for selection
  // suppressHydrationWarning handles the mismatch without flicker (rendering-hydration-no-flicker)

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 shrink-0 text-muted-foreground" />
          <CardTitle className="text-sm">Appearance</CardTitle>
        </div>
        <CardDescription className="text-xs">Customize how Check looks for you</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-2">
          <Label className="text-sm">Theme</Label>
          <div className="flex gap-2" suppressHydrationWarning>
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  suppressHydrationWarning
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1.5 rounded-md border p-3 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Select your preferred theme or sync with system
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
