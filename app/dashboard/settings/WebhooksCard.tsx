'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Webhook,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  TestTube,
  Loader2,
  CheckCircle,
  XCircle,
  History,
} from 'lucide-react';
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
  orgId: string;
  canEdit: boolean;
}

export function WebhooksCard({ orgId, canEdit }: WebhooksCardProps) {
  const router = useRouter();
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
    } catch (error) {
      console.error('Error fetching webhooks:', error);
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
    } catch (error) {
      console.error('Error toggling webhook:', error);
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
    } catch (error) {
      console.error('Error testing webhook:', error);
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
    } catch (error) {
      console.error('Error deleting webhook:', error);
    } finally {
      setActionLoading(null);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (webhook: WebhookData) => {
    // Show test result if available
    if (testResult?.id === webhook.id) {
      return testResult.success ? (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="mr-1 h-3 w-3" />
          Success
        </Badge>
      ) : (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    }

    // Inactive webhook
    if (!webhook.isActive) {
      return <Badge variant="secondary">Paused</Badge>;
    }

    // Active with failures
    if (webhook.failureCount > 0) {
      return (
        <Badge variant="destructive" className="cursor-pointer" onClick={() => setDeliveriesWebhook(webhook)}>
          {webhook.failureCount} failure{webhook.failureCount > 1 ? 's' : ''}
        </Badge>
      );
    }

    // Active and healthy
    return (
      <Badge variant="default" className="bg-green-500">
        Active
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-muted-foreground" />
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
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
                            >
                              {actionLoading === webhook.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone.
              All delivery history will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteWebhook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
