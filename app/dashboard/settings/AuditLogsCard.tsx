'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  History,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Key,
  Users,
  Webhook,
  Settings,
  AlertTriangle,
  Search,
  Download,
  X,
} from 'lucide-react';
import { AUDIT_EVENT_DESCRIPTIONS, RESOURCE_TYPE_LABELS } from '@/lib/audit/types';
import type { AuditEventType } from '@/utils/db/schema';

interface AuditLog {
  id: string;
  eventType: AuditEventType;
  description: string;
  resourceType: string;
  resourceId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ApiAuditLog {
  id: string;
  eventType: AuditEventType;
  description: string;
  resourceType: string;
  resourceId: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface AuditLogsResponse {
  logs: ApiAuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const EVENT_CATEGORIES = [
  { value: 'all', label: 'All Events' },
  { value: 'api_key', label: 'API Keys' },
  { value: 'team_member', label: 'Team' },
  { value: 'webhook', label: 'Webhooks' },
  { value: 'escalation', label: 'Escalations' },
  { value: 'org', label: 'Organization' },
];

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

function getEventIcon(eventType: string) {
  if (eventType.startsWith('api_key')) return <Key className="h-4 w-4" />;
  if (eventType.startsWith('team_member')) return <Users className="h-4 w-4" />;
  if (eventType.startsWith('webhook')) return <Webhook className="h-4 w-4" />;
  if (eventType.startsWith('escalation')) return <AlertTriangle className="h-4 w-4" />;
  return <Settings className="h-4 w-4" />;
}

function getEventBadgeVariant(
  eventType: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (
    eventType.includes('deleted') ||
    eventType.includes('removed') ||
    eventType.includes('revoked')
  ) {
    return 'destructive';
  }
  if (eventType.includes('created') || eventType.includes('joined')) {
    return 'default';
  }
  return 'secondary';
}

export function AuditLogsCard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [category, setCategory] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const pageSize = 10;
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString(),
      });

      if (category !== 'all') {
        params.set('resourceType', category);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      if (dateRange !== 'all') {
        const days = parseInt(dateRange, 10);
        const fromDate = startOfDay(subDays(new Date(), days));
        params.set('from', fromDate.toISOString());
        params.set('to', endOfDay(new Date()).toISOString());
      }

      const res = await fetch(`/api/dashboard/audit-logs?${params}`);
      if (res.ok) {
        const data: AuditLogsResponse = await res.json();
        const transformedLogs: AuditLog[] = data.logs.map((log) => ({
          id: log.id,
          eventType: log.eventType,
          description: log.description,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          changes: log.changes,
          metadata: log.metadata,
          createdAt: log.createdAt,
          userId: log.user?.id || null,
          userName: log.user?.name || null,
          userEmail: log.user?.email || null,
        }));
        setLogs(transformedLogs);
        setTotal(data.pagination.total);
        setTotalPages(Math.ceil(data.pagination.total / pageSize));
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, category, debouncedSearch, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all logs for export (up to 1000)
      const params = new URLSearchParams({
        limit: '1000',
        offset: '0',
      });

      if (category !== 'all') {
        params.set('resourceType', category);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      if (dateRange !== 'all') {
        const days = parseInt(dateRange, 10);
        const fromDate = startOfDay(subDays(new Date(), days));
        params.set('from', fromDate.toISOString());
        params.set('to', endOfDay(new Date()).toISOString());
      }

      const res = await fetch(`/api/dashboard/audit-logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch logs');

      const data: AuditLogsResponse = await res.json();

      // Convert to CSV
      const headers = ['Timestamp', 'Event', 'Description', 'User', 'Resource Type', 'Resource ID'];
      const rows = data.logs.map((log) => [
        format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        AUDIT_EVENT_DESCRIPTIONS[log.eventType] || log.eventType,
        `"${(log.description || '').replace(/"/g, '""')}"`,
        log.user?.name || log.user?.email || 'System',
        RESOURCE_TYPE_LABELS[log.resourceType] || log.resourceType,
        log.resourceId || '',
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setCategory('all');
    setDateRange('all');
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters = category !== 'all' || dateRange !== 'all' || searchQuery !== '';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                  Track all activity in your organization ({total} events)
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || logs.length === 0}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by description or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dateRange}
              onValueChange={(v) => {
                setDateRange(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <History className="mb-2 h-8 w-8 opacity-50" />
              <p>{hasActiveFilters ? 'No logs match your filters' : 'No audit logs found'}</p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Event</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEventIcon(log.eventType)}
                            <Badge variant={getEventBadgeVariant(log.eventType)}>
                              {AUDIT_EVENT_DESCRIPTIONS[log.eventType] || log.eventType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">{log.description}</TableCell>
                        <TableCell>{log.userName || log.userEmail || 'System'}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getEventIcon(selectedLog.eventType)}
              {selectedLog &&
                (AUDIT_EVENT_DESCRIPTIONS[selectedLog.eventType] || selectedLog.eventType)}
            </DialogTitle>
            <DialogDescription>{selectedLog?.description}</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{format(new Date(selectedLog.createdAt), 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">
                    {selectedLog.userName || selectedLog.userEmail || 'System'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resource Type</p>
                  <p className="font-medium">
                    {RESOURCE_TYPE_LABELS[selectedLog.resourceType] || selectedLog.resourceType}
                  </p>
                </div>
                {selectedLog.resourceId && (
                  <div>
                    <p className="text-muted-foreground">Resource ID</p>
                    <p className="truncate font-mono text-xs">{selectedLog.resourceId}</p>
                  </div>
                )}
              </div>

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Changes</p>
                  <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Metadata</p>
                  <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
