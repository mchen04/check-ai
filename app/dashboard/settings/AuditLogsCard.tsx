'use client';

import { useState, useCallback } from 'react';
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
import { SimplePagination } from '@/components/ui/pagination';
import { FilteredEmptyState } from '@/components/ui/empty-state';
import { LoadingState, ButtonSpinner } from '@/components/ui/loading-spinner';
import {
  History,
  Key,
  Users,
  Webhook,
  Settings,
  AlertTriangle,
  Search,
  Download,
  X,
} from 'lucide-react';
import {
  AUDIT_EVENT_DESCRIPTIONS,
  RESOURCE_TYPE_LABELS,
  transformApiAuditLog,
  type AuditLogDisplay,
  type AuditLogsApiResponse,
} from '@/lib/audit/types';
import { useFetchWithPagination } from '@/hooks';

interface AuditLogsFilters {
  category: string;
  dateRange: string;
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

// Build query params from filters
const buildAuditLogQueryParams = (
  filters: AuditLogsFilters,
  _search: string
): Record<string, string> => {
  const params: Record<string, string> = {};

  if (filters.category !== 'all') {
    params.resourceType = filters.category;
  }

  if (filters.dateRange !== 'all') {
    const days = parseInt(filters.dateRange, 10);
    const fromDate = startOfDay(subDays(new Date(), days));
    params.from = fromDate.toISOString();
    params.to = endOfDay(new Date()).toISOString();
  }

  return params;
};

export function AuditLogsCard() {
  const [exporting, setExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogDisplay | null>(null);

  const {
    data: logs,
    isLoading: loading,
    pagination,
    searchQuery,
    setSearchQuery,
    filters,
    setFilter,
    resetFilters,
    setPage,
    hasActiveFilters,
  } = useFetchWithPagination<AuditLogDisplay, AuditLogsApiResponse, AuditLogsFilters>({
    endpoint: '/api/dashboard/audit-logs',
    pageSize: 10,
    initialFilters: { category: 'all', dateRange: 'all' },
    transformResponse: (response) => ({
      data: response.logs.map(transformApiAuditLog),
      total: response.pagination.total,
    }),
    buildQueryParams: buildAuditLogQueryParams,
  });

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Build query params for export
      const params = new URLSearchParams({ limit: '1000', offset: '0' });

      if (filters.category !== 'all') {
        params.set('resourceType', filters.category);
      }

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      if (filters.dateRange !== 'all') {
        const days = parseInt(filters.dateRange, 10);
        const fromDate = startOfDay(subDays(new Date(), days));
        params.set('from', fromDate.toISOString());
        params.set('to', endOfDay(new Date()).toISOString());
      }

      const res = await fetch(`/api/dashboard/audit-logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch logs');

      const data: AuditLogsApiResponse = await res.json();

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
  }, [filters, searchQuery]);

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
                  Track all activity in your organization ({pagination.total} events)
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
                <ButtonSpinner />
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
              value={filters.category}
              onValueChange={(v) => setFilter('category', v)}
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
              value={filters.dateRange}
              onValueChange={(v) => setFilter('dateRange', v)}
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
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState height="sm" className="h-40" />
          ) : logs.length === 0 ? (
            <FilteredEmptyState
              icon={History}
              hasActiveFilters={hasActiveFilters}
              filteredMessage="No logs match your filters"
              emptyMessage="No audit logs found"
              onClearFilters={resetFilters}
              className="h-40"
            />
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

              <SimplePagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
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
