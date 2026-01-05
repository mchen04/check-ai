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
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Security</CardTitle>
        </div>
        <CardDescription>Manage your security preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Two-Factor Authentication</Label>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
          <Badge variant="outline">Coming Soon</Badge>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>Password</Label>
          <p className="text-sm text-muted-foreground">
            Change your password or reset it via email
          </p>
          <Button variant="outline" asChild>
            <Link href="/forgot-password">Change Password</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
