'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Palette, Monitor, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppearanceSettingsCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-6 w-6 shrink-0 text-muted-foreground" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Customize how Check looks for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[72px]" />
        </CardContent>
      </Card>
    );
  }

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-6 w-6 shrink-0 text-muted-foreground" />
          <CardTitle>Appearance</CardTitle>
        </div>
        <CardDescription>Customize how Check looks for you</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="flex gap-2">
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
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
            Select your preferred theme or sync with your system settings
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
