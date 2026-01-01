'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock,
    ChevronRight,
    RefreshCw,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface Verification {
    id: string;
    content: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'escalated';
    verdict: string | null;
    confidence: number | null;
    processingTimeMs: number | null;
    costCents: number | null;
    createdAt: string;
    completedAt: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function getVerdictIcon(verdict: string | null) {
    switch (verdict) {
        case 'true':
            return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'false':
            return <XCircle className="h-4 w-4 text-red-500" />;
        case 'uncertain':
            return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        default:
            return <Clock className="h-4 w-4 text-gray-400" />;
    }
}

function getVerdictBadge(verdict: string | null) {
    switch (verdict) {
        case 'true':
            return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
        case 'false':
            return <Badge className="bg-red-100 text-red-800">False</Badge>;
        case 'uncertain':
            return <Badge className="bg-yellow-100 text-yellow-800">Uncertain</Badge>;
        default:
            return <Badge variant="outline">Pending</Badge>;
    }
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'completed':
            return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
        case 'processing':
            return <Badge className="bg-purple-100 text-purple-800">Processing</Badge>;
        case 'failed':
            return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
        case 'escalated':
            return <Badge className="bg-orange-100 text-orange-800">Escalated</Badge>;
        default:
            return <Badge variant="outline">Pending</Badge>;
    }
}

function truncateContent(content: string, maxLength: number = 60): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function VerificationHistoryPage() {
    const router = useRouter();
    const [verifications, setVerifications] = useState<Verification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchVerifications = async (pageNum: number = 1) => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/dashboard/verifications?page=${pageNum}&limit=20`);

            if (!response.ok) {
                throw new Error('Failed to fetch verifications');
            }

            const data = await response.json();
            setVerifications(pageNum === 1 ? data.verifications : [...verifications, ...data.verifications]);
            setHasMore(data.hasMore);
            setPage(pageNum);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVerifications();
    }, []);

    const handleRefresh = () => {
        fetchVerifications(1);
    };

    const handleLoadMore = () => {
        fetchVerifications(page + 1);
    };

    const handleRowClick = (id: string) => {
        router.push(`/dashboard/verify/${id}`);
    };

    // Calculate stats
    const stats = {
        total: verifications.length,
        verified: verifications.filter((v) => v.verdict === 'true').length,
        false: verifications.filter((v) => v.verdict === 'false').length,
        uncertain: verifications.filter((v) => v.verdict === 'uncertain').length,
        avgConfidence:
            verifications.filter((v) => v.confidence !== null).length > 0
                ? (
                      verifications
                          .filter((v) => v.confidence !== null)
                          .reduce((sum, v) => sum + (v.confidence || 0), 0) /
                      verifications.filter((v) => v.confidence !== null).length
                  ).toFixed(1)
                : 'N/A',
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Verification History</h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage your verification requests
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => router.push('/playground')}>
                        New Verification
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total</CardDescription>
                        <CardTitle className="text-2xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Verified</CardDescription>
                        <CardTitle className="text-2xl text-green-600">{stats.verified}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>False</CardDescription>
                        <CardTitle className="text-2xl text-red-600">{stats.false}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Uncertain</CardDescription>
                        <CardTitle className="text-2xl text-yellow-600">{stats.uncertain}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Avg Confidence</CardDescription>
                        <CardTitle className="text-2xl">{stats.avgConfidence}%</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Verifications Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Verifications</CardTitle>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <div className="text-center py-8 text-red-500">
                            <p>{error}</p>
                            <Button variant="outline" onClick={handleRefresh} className="mt-4">
                                Try Again
                            </Button>
                        </div>
                    ) : verifications.length === 0 && !isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No verifications yet</p>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/playground')}
                                className="mt-4"
                            >
                                Create your first verification
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Content</TableHead>
                                    <TableHead>Verdict</TableHead>
                                    <TableHead>Confidence</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {verifications.map((v) => (
                                    <TableRow
                                        key={v.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleRowClick(v.id)}
                                    >
                                        <TableCell>{getStatusBadge(v.status)}</TableCell>
                                        <TableCell className="max-w-xs">
                                            <span className="font-mono text-sm">
                                                {truncateContent(v.content)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getVerdictIcon(v.verdict)}
                                                {getVerdictBadge(v.verdict)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {v.confidence !== null
                                                ? `${(v.confidence * 100).toFixed(1)}%`
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {v.processingTimeMs !== null
                                                ? `${v.processingTimeMs}ms`
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {v.costCents !== null
                                                ? `$${(v.costCents / 100).toFixed(4)}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDistanceToNow(new Date(v.createdAt), {
                                                addSuffix: true,
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {hasMore && !isLoading && verifications.length > 0 && (
                        <div className="text-center mt-4">
                            <Button variant="outline" onClick={handleLoadMore}>
                                Load More
                            </Button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground mt-2">Loading...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
