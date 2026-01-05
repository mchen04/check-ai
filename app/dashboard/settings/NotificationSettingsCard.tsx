'use client';

import { useState, useEffect } from 'react';
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
import { Bell, Loader2 } from 'lucide-react';

interface NotificationSettingsCardProps {
  initialPreferences?: {
    emailNotifications: boolean;
    weeklyReport: boolean;
    escalationAlerts: boolean;
  };
}

export function NotificationSettingsCard({ initialPreferences }: NotificationSettingsCardProps) {
  const [emailNotifications, setEmailNotifications] = useState(
    initialPreferences?.emailNotifications ?? true
  );
  const [weeklyReport, setWeeklyReport] = useState(initialPreferences?.weeklyReport ?? false);
  const [escalationAlerts, setEscalationAlerts] = useState(
    initialPreferences?.escalationAlerts ?? true
  );
  const [savingField, setSavingField] = useState<string | null>(null);

  const updatePreference = async (field: string, value: boolean) => {
    setSavingField(field);

    try {
      const response = await fetch('/api/dashboard/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        // Revert on error
        switch (field) {
          case 'emailNotifications':
            setEmailNotifications(!value);
            break;
          case 'weeklyReport':
            setWeeklyReport(!value);
            break;
          case 'escalationAlerts':
            setEscalationAlerts(!value);
            break;
        }
      }
    } catch {
      // Revert on error
      switch (field) {
        case 'emailNotifications':
          setEmailNotifications(!value);
          break;
        case 'weeklyReport':
          setWeeklyReport(!value);
          break;
        case 'escalationAlerts':
          setEscalationAlerts(!value);
          break;
      }
    } finally {
      setSavingField(null);
    }
  };

  const handleEmailNotifications = (checked: boolean) => {
    setEmailNotifications(checked);
    updatePreference('emailNotifications', checked);
  };

  const handleWeeklyReport = (checked: boolean) => {
    setWeeklyReport(checked);
    updatePreference('weeklyReport', checked);
  };

  const handleEscalationAlerts = (checked: boolean) => {
    setEscalationAlerts(checked);
    updatePreference('escalationAlerts', checked);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Notifications</CardTitle>
        </div>
        <CardDescription>Configure how you receive alerts and updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive email alerts for escalations and usage limits
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savingField === 'emailNotifications' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={emailNotifications}
              onCheckedChange={handleEmailNotifications}
              disabled={savingField !== null}
            />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Weekly Usage Report</Label>
            <p className="text-sm text-muted-foreground">
              Get a weekly summary of your API usage
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savingField === 'weeklyReport' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={weeklyReport}
              onCheckedChange={handleWeeklyReport}
              disabled={savingField !== null}
            />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Escalation Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when verifications are escalated
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savingField === 'escalationAlerts' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={escalationAlerts}
              onCheckedChange={handleEscalationAlerts}
              disabled={savingField !== null}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
