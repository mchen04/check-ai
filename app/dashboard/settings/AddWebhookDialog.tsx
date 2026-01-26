'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Webhook, Copy, Check } from 'lucide-react';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { useCopyToClipboard } from '@/hooks';
import { InlineError } from '@/components/ui/empty-state';
import { getErrorMessage } from '@/lib/utils';

const WEBHOOK_EVENTS = [
  { value: 'verification.completed', label: 'Verification Completed', description: 'When a verification finishes' },
  { value: 'verification.escalated', label: 'Verification Escalated', description: 'When a verification needs human review' },
  { value: 'escalation.resolved', label: 'Escalation Resolved', description: 'When an escalation is resolved' },
  { value: 'usage.limit.warning', label: 'Usage Warning', description: 'When usage reaches 80% of limit' },
  { value: 'usage.limit.reached', label: 'Usage Limit Reached', description: 'When usage limit is reached' },
];

interface AddWebhookDialogProps {
  onSuccess: () => void;
}

export function AddWebhookDialog({ onSuccess }: AddWebhookDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [signingSecret, setSigningSecret] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard();

  const handleCreate = async () => {
    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    if (selectedEvents.length === 0) {
      setError('Select at least one event');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          events: selectedEvents,
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create webhook');
      }

      setSuccess(true);
      setSigningSecret(data.signingSecret);
      onSuccess();
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to create webhook'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (signingSecret) {
      copy(signingSecret);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setUrl('');
      setDescription('');
      setSelectedEvents([]);
      setSuccess(false);
      setSigningSecret(null);
      setError(null);
    }, 300);
  };

  const toggleEvent = (eventValue: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventValue)
        ? prev.filter((e) => e !== eventValue)
        : [...prev, eventValue]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Webhook className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Webhook Created!</DialogTitle>
              <DialogDescription>
                Save your signing secret now - it won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-4">
              <div className="space-y-2">
                <Label>Signing Secret</Label>
                <p className="text-xs text-muted-foreground">
                  Use this to verify webhook signatures
                </p>
                <div className="flex gap-2">
                  <Input
                    value={signingSecret || ''}
                    readOnly
                    className="flex-1 font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopySecret} aria-label="Copy signing secret">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Verify signatures:</strong> Compute HMAC-SHA256 of{' '}
                  <code className="rounded bg-background px-1">timestamp.payload</code> with this
                  secret and compare to the <code className="rounded bg-background px-1">X-Webhook-Signature</code> header.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Webhook</DialogTitle>
              <DialogDescription>
                Configure a webhook endpoint to receive event notifications
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-app.com/webhooks/check"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-description">Description (optional)</Label>
                <Input
                  id="webhook-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Production webhook for..."
                />
              </div>

              <div className="space-y-2">
                <Label>Events</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event.value} className="flex items-start gap-3">
                      <Checkbox
                        id={event.value}
                        checked={selectedEvents.includes(event.value)}
                        onCheckedChange={() => toggleEvent(event.value)}
                      />
                      <div className="grid gap-0.5">
                        <label
                          htmlFor={event.value}
                          className="cursor-pointer text-sm font-medium"
                        >
                          {event.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <InlineError message={error} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isLoading}>
                {isLoading && <ButtonSpinner />}
                {isLoading ? 'Creating...' : 'Create Webhook'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
