'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestResultBadge, ActiveStatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Webhook,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  TestTube,
  History,
} from 'lucide-react';
import { LoadingState, LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatDate } from '@/lib/utils';
import { AddWebhookDialog } from './AddWebhookDialog';
import { WebhookDeliveriesDialog } from './WebhookDeliveriesDialog';

interface WebhookData {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatus: number | null;
  failureCount: number;
  createdAt: string;
}

interface WebhooksCardProps {
  canEdit: boolean;
}

export function WebhooksCard({ canEdit }: WebhooksCardProps) {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null);
  const [deliveriesWebhook, setDeliveriesWebhook] = useState<WebhookData | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/dashboard/settings/webhooks');
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks);
      }
    } catch {
      // Network errors are handled silently - empty state will be shown
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    setActionLoading(webhookId);
    try {
      const response = await fetch(`/api/dashboard/settings/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        setWebhooks((prev) =>
          prev.map((w) => (w.id === webhookId ? { ...w, isActive: !isActive, failureCount: 0 } : w))
        );
      }
    } catch {
      // Toggle errors are handled silently - UI state remains unchanged
    } finally {
      setActionLoading(null);
    }
  };

  const testWebhook = async (webhookId: string) => {
    setActionLoading(webhookId);
    setTestResult(null);
    try {
      const response = await fetch(`/api/dashboard/settings/webhooks/${webhookId}/test`, {
        method: 'POST',
      });

      const data = await response.json();
      setTestResult({ id: webhookId, success: data.success });
      setTimeout(() => setTestResult(null), 3000);
    } catch {
      setTestResult({ id: webhookId, success: false });
      setTimeout(() => setTestResult(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteWebhook = async () => {
    if (!deleteId) return;

    setActionLoading(deleteId);
    try {
      const response = await fetch(`/api/dashboard/settings/webhooks/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== deleteId));
      }
    } catch {
      // Deletion errors are handled silently - UI state remains unchanged
    } finally {
      setActionLoading(null);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (webhook: WebhookData) => {
    // Show test result if available
    if (testResult?.id === webhook.id) {
      return <TestResultBadge success={testResult.success} />;
    }

    // Inactive webhook
    if (!webhook.isActive) {
      return <ActiveStatusBadge isActive={false} inactiveLabel="Paused" />;
    }

    // Active with failures - keep inline for onClick handler
    if (webhook.failureCount > 0) {
      return (
        <Badge
          variant="destructive"
          className="cursor-pointer"
          onClick={() => setDeliveriesWebhook(webhook)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDeliveriesWebhook(webhook); }}}
          role="button"
          tabIndex={0}
          aria-label={`View ${webhook.failureCount} delivery failure${webhook.failureCount > 1 ? 's' : ''}`}
        >
          {webhook.failureCount} failure{webhook.failureCount > 1 ? 's' : ''}
        </Badge>
      );
    }

    // Active and healthy
    return <ActiveStatusBadge isActive={true} />;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-6 w-6 shrink-0 text-muted-foreground" />
              <CardTitle>Webhooks</CardTitle>
            </div>
            {canEdit && (
              <AddWebhookDialog onSuccess={fetchWebhooks} />
            )}
          </div>
          <CardDescription>
            Receive real-time notifications when verification events occur. Webhooks automatically retry on failure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState height="sm" />
          ) : webhooks.length === 0 ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="mb-4 text-sm text-muted-foreground">
                No webhooks configured. Set up webhooks to receive POST requests when
                verifications complete, escalate, or other events occur.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">verification.completed</Badge>
                <Badge variant="secondary">verification.escalated</Badge>
                <Badge variant="secondary">escalation.resolved</Badge>
                <Badge variant="secondary">usage.limit.reached</Badge>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  {canEdit && <TableHead className="w-[70px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs">
                      {webhook.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event.split('.')[1]}
                          </Badge>
                        ))}
                        {webhook.events.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{webhook.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(webhook)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(webhook.lastTriggeredAt)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actionLoading === webhook.id}
                              aria-label="Webhook actions"
                            >
                              {actionLoading === webhook.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDeliveriesWebhook(webhook)}>
                              <History className="mr-2 h-4 w-4" />
                              View Deliveries
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => testWebhook(webhook.id)}>
                              <TestTube className="mr-2 h-4 w-4" />
                              Send Test
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleWebhook(webhook.id, webhook.isActive)}
                            >
                              {webhook.isActive ? (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(webhook.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Deliveries Dialog */}
      {deliveriesWebhook && (
        <WebhookDeliveriesDialog
          webhookId={deliveriesWebhook.id}
          webhookUrl={deliveriesWebhook.url}
          open={!!deliveriesWebhook}
          onOpenChange={(open) => !open && setDeliveriesWebhook(null)}
          canEdit={canEdit}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        itemName="Webhook"
        description="Are you sure you want to delete this webhook? This action cannot be undone. All delivery history will also be deleted."
        onConfirm={deleteWebhook}
      />
    </>
  );
}
