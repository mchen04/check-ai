'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/loading-spinner';

type PreferenceKey = 'emailNotifications' | 'weeklyReport' | 'escalationAlerts';

interface NotificationSettingsCardProps {
  initialPreferences?: {
    emailNotifications: boolean;
    weeklyReport: boolean;
    escalationAlerts: boolean;
  };
}

export function NotificationSettingsCard({ initialPreferences }: NotificationSettingsCardProps) {
  const [preferences, setPreferences] = useState({
    emailNotifications: initialPreferences?.emailNotifications ?? true,
    weeklyReport: initialPreferences?.weeklyReport ?? false,
    escalationAlerts: initialPreferences?.escalationAlerts ?? true,
  });
  const [savingField, setSavingField] = useState<PreferenceKey | null>(null);

  const updatePreference = async (field: PreferenceKey, value: boolean) => {
    setSavingField(field);
    setPreferences((prev) => ({ ...prev, [field]: value }));

    try {
      const response = await fetch('/api/dashboard/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        setPreferences((prev) => ({ ...prev, [field]: !value }));
      }
    } catch {
      setPreferences((prev) => ({ ...prev, [field]: !value }));
    } finally {
      setSavingField(null);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
          <CardTitle className="text-sm">Notifications</CardTitle>
        </div>
        <CardDescription className="text-xs">Configure how you receive alerts and updates</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm">Email Notifications</Label>
            <p className="text-xs text-muted-foreground">
              Email alerts for escalations and usage limits
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savingField === 'emailNotifications' && (
              <Spinner size="sm" className="text-muted-foreground" />
            )}
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
              disabled={savingField !== null}
            />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm">Weekly Usage Report</Label>
            <p className="text-xs text-muted-foreground">
              Weekly summary of your API usage
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savingField === 'weeklyReport' && (
              <Spinner size="sm" className="text-muted-foreground" />
            )}
            <Switch
              checked={preferences.weeklyReport}
              onCheckedChange={(checked) => updatePreference('weeklyReport', checked)}
              disabled={savingField !== null}
            />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm">Escalation Alerts</Label>
            <p className="text-xs text-muted-foreground">
              Notified when verifications are escalated
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savingField === 'escalationAlerts' && (
              <Spinner size="sm" className="text-muted-foreground" />
            )}
            <Switch
              checked={preferences.escalationAlerts}
              onCheckedChange={(checked) => updatePreference('escalationAlerts', checked)}
              disabled={savingField !== null}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
