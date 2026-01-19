'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

// Retention period options
const RETENTION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days (default)' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
];

interface DataRetentionCardProps {
  initialSettings: {
    dataRetentionEnabled: boolean;
    verificationRetentionDays: number;
    batchRetentionDays: number;
  };
  canEdit: boolean;
}

export function DataRetentionCard({ initialSettings, canEdit }: DataRetentionCardProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    pendingSettings: typeof settings | null;
  }>({ open: false, pendingSettings: null });

  const hasChanges =
    settings.dataRetentionEnabled !== initialSettings.dataRetentionEnabled ||
    settings.verificationRetentionDays !== initialSettings.verificationRetentionDays ||
    settings.batchRetentionDays !== initialSettings.batchRetentionDays;

  const isReducingRetention =
    settings.verificationRetentionDays < initialSettings.verificationRetentionDays ||
    settings.batchRetentionDays < initialSettings.batchRetentionDays;

  const handleSave = async (confirmedSettings?: typeof settings) => {
    const settingsToSave = confirmedSettings || settings;

    // If reducing retention, show confirmation dialog first
    if (!confirmedSettings && isReducingRetention) {
      setConfirmDialog({ open: true, pendingSettings: settingsToSave });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/dashboard/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataRetentionEnabled: settingsToSave.dataRetentionEnabled,
          verificationRetentionDays: settingsToSave.verificationRetentionDays,
          batchRetentionDays: settingsToSave.batchRetentionDays,
        }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving retention settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (confirmDialog.pendingSettings) {
      handleSave(confirmDialog.pendingSettings);
    }
    setConfirmDialog({ open: false, pendingSettings: null });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 shrink-0 text-muted-foreground" />
            <CardTitle>Data Retention</CardTitle>
          </div>
          <CardDescription>
            Configure how long verification and batch data is retained. Data older than the
            retention period is automatically deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="retention-enabled">Automatic Data Cleanup</Label>
              <p className="text-sm text-muted-foreground">
                Automatically delete old verifications and batch results
              </p>
            </div>
            <Switch
              id="retention-enabled"
              checked={settings.dataRetentionEnabled}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, dataRetentionEnabled: checked }))
              }
              disabled={!canEdit}
            />
          </div>

          {settings.dataRetentionEnabled && (
            <>
              {/* Verification Retention */}
              <div className="space-y-2">
                <Label htmlFor="verification-retention">Verification Retention</Label>
                <Select
                  value={String(settings.verificationRetentionDays)}
                  onValueChange={(value) =>
                    setSettings((s) => ({
                      ...s,
                      verificationRetentionDays: parseInt(value, 10),
                    }))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger id="verification-retention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETENTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Individual verification results and associated data
                </p>
              </div>

              {/* Batch Retention */}
              <div className="space-y-2">
                <Label htmlFor="batch-retention">Batch Job Retention</Label>
                <Select
                  value={String(settings.batchRetentionDays)}
                  onValueChange={(value) =>
                    setSettings((s) => ({
                      ...s,
                      batchRetentionDays: parseInt(value, 10),
                    }))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger id="batch-retention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETENTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Batch jobs and all associated item results
                </p>
              </div>
            </>
          )}

          {/* Warning about disabled retention */}
          {!settings.dataRetentionEnabled && (
            <div className="rounded-lg bg-yellow-500/10 p-3 text-sm">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Retention disabled</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Data will be stored indefinitely. This may increase storage costs and affect
                compliance.
              </p>
            </div>
          )}

          {/* Save Button */}
          {canEdit && hasChanges && (
            <div className="flex items-center gap-2">
              <Button onClick={() => handleSave()} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saved ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Saved
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSettings(initialSettings)}
                disabled={isLoading}
              >
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Reducing Retention */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, pendingSettings: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reduce Data Retention?</AlertDialogTitle>
            <AlertDialogDescription>
              Reducing the retention period may result in immediate deletion of data that exceeds
              the new limit. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Reduction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
