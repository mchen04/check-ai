'use client';

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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield } from 'lucide-react';

export function SecuritySettingsCard() {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
          <CardTitle className="text-sm">Security</CardTitle>
        </div>
        <CardDescription className="text-xs">Manage your security preferences</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm">Two-Factor Authentication</Label>
            <p className="text-xs text-muted-foreground">
              Add extra security to your account
            </p>
          </div>
          <Badge variant="outline">Coming Soon</Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm">Password</Label>
            <p className="text-xs text-muted-foreground">
              Change your password or reset via email
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/forgot-password">Change Password</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
