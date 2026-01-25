'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import Link from 'next/link';

interface EscalationActionsProps {
  escalationId: string;
  verificationId: string;
}

export function EscalationActions({
  escalationId,
  verificationId,
}: EscalationActionsProps) {
  const router = useRouter();
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [isDismissOpen, setIsDismissOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve form state
  const [humanVerdict, setHumanVerdict] = useState<'true' | 'false' | 'uncertain'>('true');
  const [resolution, setResolution] = useState('');

  // Reset form state when dialogs open/close
  const handleResolveOpenChange = (open: boolean) => {
    setIsResolveOpen(open);
    if (open) {
      setHumanVerdict('true');
      setResolution('');
      setError(null);
    }
  };

  const handleDismissOpenChange = (open: boolean) => {
    setIsDismissOpen(open);
    if (open) {
      setResolution('');
      setError(null);
    }
  };

  const handleResolve = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/escalations/${escalationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          humanVerdict,
          resolution: resolution || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resolve escalation');
      }

      setIsResolveOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard/escalations/${escalationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          resolution: resolution || 'Dismissed as false positive',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to dismiss escalation');
      }

      setIsDismissOpen(false);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsResolveOpen(true)}>
            <CheckCircle className="mr-2 h-4 w-4 text-success" />
            Resolve with Verdict
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDismissOpen(true)}>
            <XCircle className="mr-2 h-4 w-4 text-muted-foreground" />
            Dismiss
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/verify/${verificationId}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Verification
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Resolve Dialog */}
      <Dialog open={isResolveOpen} onOpenChange={handleResolveOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Resolve Escalation</DialogTitle>
            <DialogDescription>
              Provide your verdict for this verification. This will override the
              AI-generated verdict.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Label>Human Verdict</Label>
              <RadioGroup
                value={humanVerdict}
                onValueChange={(v: string) => setHumanVerdict(v as 'true' | 'false' | 'uncertain')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="true" id="true" />
                  <Label htmlFor="true" className="flex-1 cursor-pointer">
                    <span className="font-medium">True</span>
                    <p className="text-xs text-muted-foreground">
                      The content is accurate and factually correct
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="false" id="false" />
                  <Label htmlFor="false" className="flex-1 cursor-pointer">
                    <span className="font-medium">False</span>
                    <p className="text-xs text-muted-foreground">
                      The content contains inaccuracies or hallucinations
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="uncertain" id="uncertain" />
                  <Label htmlFor="uncertain" className="flex-1 cursor-pointer">
                    <span className="font-medium">Uncertain</span>
                    <p className="text-xs text-muted-foreground">
                      Unable to determine the accuracy with confidence
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution">Notes (optional)</Label>
              <Textarea
                id="resolution"
                placeholder="Add any notes about your decision..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleResolveOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={isLoading}>
              {isLoading && <ButtonSpinner />}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss Dialog */}
      <Dialog open={isDismissOpen} onOpenChange={handleDismissOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Dismiss Escalation</DialogTitle>
            <DialogDescription>
              Dismiss this escalation as a false positive. The original AI verdict
              will be kept.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dismiss-notes">Reason for dismissal (optional)</Label>
              <Textarea
                id="dismiss-notes"
                placeholder="Why are you dismissing this escalation?"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDismissOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleDismiss} disabled={isLoading}>
              {isLoading && <ButtonSpinner />}
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
