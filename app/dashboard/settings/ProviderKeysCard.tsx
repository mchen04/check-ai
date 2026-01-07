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
  Key,
  MoreHorizontal,
  Trash2,
  TestTube,
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { AddProviderKeyDialog } from './AddProviderKeyDialog';

// Provider display configurations
const PROVIDER_CONFIG: Record<string, { label: string; color: string }> = {
  openai: { label: 'OpenAI', color: 'bg-emerald-500' },
  anthropic: { label: 'Anthropic', color: 'bg-orange-500' },
  google: { label: 'Google AI', color: 'bg-blue-500' },
  deepseek: { label: 'DeepSeek', color: 'bg-purple-500' },
  groq: { label: 'Groq', color: 'bg-red-500' },
  together: { label: 'Together AI', color: 'bg-cyan-500' },
  mistral: { label: 'Mistral AI', color: 'bg-yellow-500' },
  cohere: { label: 'Cohere', color: 'bg-pink-500' },
};

interface ProviderKey {
  id: string;
  name: string;
  provider: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ProviderKeysCardProps {
  canEdit: boolean;
}

export function ProviderKeysCard({ canEdit }: ProviderKeysCardProps) {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; valid: boolean } | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/dashboard/provider-keys');
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys);
      }
    } catch (error) {
      console.error('Error fetching provider keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testKey = async (keyId: string) => {
    setActionLoading(keyId);
    setTestResult(null);
    try {
      const response = await fetch(`/api/dashboard/provider-keys/${keyId}/validate`, {
        method: 'POST',
      });

      const data = await response.json();
      setTestResult({ id: keyId, valid: data.valid });
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error('Error testing key:', error);
      setTestResult({ id: keyId, valid: false });
      setTimeout(() => setTestResult(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteKey = async () => {
    if (!deleteId) return;

    setActionLoading(deleteId);
    try {
      const response = await fetch(`/api/dashboard/provider-keys/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== deleteId));
      }
    } catch (error) {
      console.error('Error deleting key:', error);
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

  const getStatusBadge = (key: ProviderKey) => {
    // Show test result if available
    if (testResult?.id === key.id) {
      return testResult.valid ? (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="mr-1 h-3 w-3" />
          Valid
        </Badge>
      ) : (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Invalid
        </Badge>
      );
    }

    // Inactive key
    if (!key.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    // Active key
    return (
      <Badge variant="default" className="bg-green-500">
        Active
      </Badge>
    );
  };

  const existingProviders = keys.map((k) => k.provider);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Provider API Keys</CardTitle>
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="mr-1 h-3 w-3" />
                BYOK
              </Badge>
            </div>
            {canEdit && (
              <AddProviderKeyDialog onSuccess={fetchKeys} existingProviders={existingProviders} />
            )}
          </div>
          <CardDescription>
            Bring your own API keys for LLM providers. Your keys are encrypted and used instead of
            platform keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                No provider keys configured. Add your own API keys to:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Control your own costs and rate limits
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Access premium models on your accounts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Use enterprise agreements with providers
                </li>
              </ul>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  {canEdit && <TableHead className="w-[70px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => {
                  const config = PROVIDER_CONFIG[key.provider] || {
                    label: key.provider,
                    color: 'bg-gray-500',
                  };
                  return (
                    <TableRow key={key.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${config.color}`} />
                          <span className="font-medium">{config.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{key.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {key.keyPrefix}...
                      </TableCell>
                      <TableCell>{getStatusBadge(key)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(key.lastUsedAt)}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={actionLoading === key.id}
                              >
                                {actionLoading === key.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => testKey(key.id)}>
                                <TestTube className="mr-2 h-4 w-4" />
                                Test Key
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(key.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? Verifications will fall back to platform
              keys. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteKey}
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
