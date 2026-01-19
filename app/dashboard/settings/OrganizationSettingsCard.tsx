'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Building2, Users, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

interface OrganizationSettingsCardProps {
  organization: {
    name: string;
    slug: string;
    planType: string;
    defaultVerificationMethod: string;
    autoEscalateThreshold: number;
    cacheEnabled: boolean;
    storeVerificationContent: boolean;
  };
  memberCount: number;
  canEdit: boolean;
}

const VERIFICATION_METHODS = [
  { value: 'semantic', label: 'Semantic' },
  { value: 'reasoning', label: 'Reasoning' },
  { value: 'ensemble', label: 'Ensemble' },
  { value: 'entropy', label: 'Entropy' },
  { value: 'formal', label: 'Formal' },
  { value: 'tool', label: 'Tool-Augmented' },
  { value: 'biprm', label: 'BiPRM' },
];

export function OrganizationSettingsCard({
  organization,
  memberCount,
  canEdit,
}: OrganizationSettingsCardProps) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [defaultMethod, setDefaultMethod] = useState(organization.defaultVerificationMethod);
  const [threshold, setThreshold] = useState(organization.autoEscalateThreshold);
  const [cacheEnabled, setCacheEnabled] = useState(organization.cacheEnabled);
  const [storeContent, setStoreContent] = useState(organization.storeVerificationContent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasChanges =
    name !== organization.name ||
    defaultMethod !== organization.defaultVerificationMethod ||
    threshold !== organization.autoEscalateThreshold ||
    cacheEnabled !== organization.cacheEnabled ||
    storeContent !== organization.storeVerificationContent;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/dashboard/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          defaultVerificationMethod: defaultMethod,
          autoEscalateThreshold: threshold,
          cacheEnabled,
          storeVerificationContent: storeContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update organization');
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 shrink-0 text-muted-foreground" />
          <CardTitle>Organization</CardTitle>
        </div>
        <CardDescription>Manage your organization settings and defaults</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgSlug">URL Slug</Label>
            <Input id="orgSlug" defaultValue={organization.slug} disabled className="bg-muted" />
          </div>
        </div>

        {/* Plan Info */}
        <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Current Plan:</p>
              <Badge variant={organization.planType === 'free' ? 'outline' : 'default'}>
                {organization.planType.charAt(0).toUpperCase() + organization.planType.slice(1)}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {memberCount} team member{memberCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/team">Manage Team</Link>
          </Button>
        </div>

        {organization.planType === 'free' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              Upgrade to Pro to invite team members and access all verification methods.
            </p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/subscribe">
                Upgrade to Pro
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Verification Defaults */}
        {canEdit && (
          <>
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium">Verification Defaults</h4>

              <div className="space-y-2">
                <Label htmlFor="defaultMethod">Default Verification Method</Label>
                <Select value={defaultMethod} onValueChange={setDefaultMethod}>
                  <SelectTrigger id="defaultMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used when no method is specified in API calls
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Auto-Escalate Threshold</Label>
                  <span className="text-sm text-muted-foreground">{(threshold * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[threshold * 100]}
                  onValueChange={([v]) => setThreshold(v / 100)}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-escalate verifications with confidence below this threshold
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Result Caching</Label>
                  <p className="text-xs text-muted-foreground">
                    Cache verification results for faster repeated queries
                  </p>
                </div>
                <Switch checked={cacheEnabled} onCheckedChange={setCacheEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Store Verification Content</Label>
                  <p className="text-xs text-muted-foreground">
                    Keep original prompts and responses for debugging
                  </p>
                </div>
                <Switch checked={storeContent} onCheckedChange={setStoreContent} />
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-600">Organization settings updated successfully!</div>
        )}

        {canEdit && (
          <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
