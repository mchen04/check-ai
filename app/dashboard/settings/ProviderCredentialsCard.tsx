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
import {
  ValidationStatusBadge,
  TestResultBadge,
} from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Key,
  MoreHorizontal,
  Trash2,
  TestTube,
  CheckCircle,
  Plus,
  Pencil,
} from 'lucide-react';
import { LoadingState, LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner';
import { InlineError } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import {
  PROVIDER_OPTIONS,
  getProviderColor,
  getProviderLabel,
} from '@/lib/llm/provider-ui-config';
import type { LLMProvider } from '@/lib/llm/types';

interface ProviderCredential {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  validationStatus: 'valid' | 'invalid' | 'pending';
  lastValidatedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  apiKeyCount?: number;
}

interface ProviderCredentialsCardProps {
  canEdit: boolean;
}

export function ProviderCredentialsCard({ canEdit }: ProviderCredentialsCardProps) {
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; valid: boolean } | null>(null);

  // Form state for create
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    apiKey: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [editCredential, setEditCredential] = useState<ProviderCredential | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    apiKey: '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/dashboard/provider-credentials');
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials);
      }
    } catch {
      // Network errors are handled silently - empty state will be shown
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.provider) {
      setFormError('Provider is required');
      return;
    }
    if (!formData.apiKey.trim()) {
      setFormError('API key is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/dashboard/provider-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setFormError(data.error || 'Failed to add credential');
        return;
      }

      // Reset form and close dialog
      setFormData({ name: '', provider: '', apiKey: '' });
      setIsDialogOpen(false);
      fetchCredentials();
    } catch {
      setFormError('Failed to add credential');
    } finally {
      setIsSubmitting(false);
    }
  };

  const testCredential = async (credentialId: string) => {
    setActionLoading(credentialId);
    setTestResult(null);

    try {
      const response = await fetch(`/api/dashboard/provider-credentials/${credentialId}/validate`, {
        method: 'POST',
      });

      const data = await response.json();
      setTestResult({ id: credentialId, valid: data.valid });

      // Refresh to get updated validation status
      fetchCredentials();

      setTimeout(() => setTestResult(null), 3000);
    } catch {
      setTestResult({ id: credentialId, valid: false });
      setTimeout(() => setTestResult(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteCredential = async () => {
    if (!deleteId) return;

    setActionLoading(deleteId);
    try {
      const response = await fetch(`/api/dashboard/provider-credentials/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCredentials((prev) => prev.filter((c) => c.id !== deleteId));
      }
    } catch {
      // Deletion errors are handled silently - UI state remains unchanged
    } finally {
      setActionLoading(null);
      setDeleteId(null);
    }
  };

  const openEditDialog = (credential: ProviderCredential) => {
    setEditCredential(credential);
    setEditFormData({
      name: credential.name,
      apiKey: '',
    });
    setEditError(null);
  };

  const handleEditSubmit = async () => {
    if (!editCredential) return;
    setEditError(null);

    if (!editFormData.name.trim()) {
      setEditError('Name is required');
      return;
    }

    setIsEditSubmitting(true);

    try {
      const response = await fetch(`/api/dashboard/provider-credentials/${editCredential.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          ...(editFormData.apiKey.trim() ? { apiKey: editFormData.apiKey } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setEditError(data.error || 'Failed to update credential');
        return;
      }

      setEditCredential(null);
      fetchCredentials();
    } catch {
      setEditError('Failed to update credential');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const getStatusBadge = (credential: ProviderCredential) => {
    // Show test result if available
    if (testResult?.id === credential.id) {
      return (
        <TestResultBadge
          success={testResult.valid}
          successLabel="Valid"
          failureLabel="Invalid"
        />
      );
    }

    return (
      <ValidationStatusBadge
        status={credential.validationStatus}
        isActive={credential.isActive}
        showIcon={credential.validationStatus === 'pending'}
      />
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-6 w-6 shrink-0 text-muted-foreground" />
              <CardTitle>Provider Credentials</CardTitle>
            </div>
            {canEdit && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Credential
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Provider Credential</DialogTitle>
                    <DialogDescription>
                      Add your LLM provider API key. Your credentials are encrypted and stored securely.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., openrouter-prod"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value) => setFormData({ ...formData, provider: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[240px]">
                          {PROVIDER_OPTIONS.map((provider) => (
                            <SelectItem
                              key={provider.value}
                              value={provider.value}
                              description={provider.description}
                            >
                              {provider.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="sk-..."
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      />
                    </div>
                    <InlineError message={formError} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting && <ButtonSpinner />}
                      Add Credential
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <CardDescription>
            Store your LLM provider API keys securely. These are used by your Check.ai API keys
            to access models.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState height="sm" />
          ) : credentials.length === 0 ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                No provider credentials configured. Add credentials to use with your API keys:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  OpenRouter is recommended for access to all models
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  Or use direct provider keys (OpenAI, Anthropic, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  All credentials are encrypted at rest
                </li>
              </ul>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead>Last Used</TableHead>
                  {canEdit && <TableHead className="w-[70px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell className="font-medium">{credential.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${getProviderColor(credential.provider as LLMProvider)}`}
                        />
                        <span>{getProviderLabel(credential.provider as LLMProvider)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(credential)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {credential.apiKeyCount === 0
                        ? 'No keys'
                        : credential.apiKeyCount === 1
                          ? '1 API key'
                          : `${credential.apiKeyCount} API keys`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(credential.lastUsedAt)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actionLoading === credential.id}
                              aria-label={`Actions for ${credential.name}`}
                            >
                              {actionLoading === credential.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(credential)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => testCredential(credential.id)}>
                              <TestTube className="mr-2 h-4 w-4" />
                              Test Credential
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(credential.id)}
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

      {/* Edit Dialog */}
      <Dialog open={!!editCredential} onOpenChange={(open) => !open && setEditCredential(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Provider Credential</DialogTitle>
            <DialogDescription>
              Update the credential name or replace the API key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-provider">Provider</Label>
              <Input
                id="edit-provider"
                value={getProviderLabel((editCredential?.provider || 'openai') as LLMProvider)}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Provider cannot be changed. Create a new credential for a different provider.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-apiKey">New API Key (optional)</Label>
              <Input
                id="edit-apiKey"
                type="password"
                placeholder="Leave blank to keep existing key"
                value={editFormData.apiKey}
                onChange={(e) => setEditFormData({ ...editFormData, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Only fill this if you want to replace the existing API key.
              </p>
            </div>
            <InlineError message={editError} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCredential(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isEditSubmitting}>
              {isEditSubmitting && <ButtonSpinner />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        itemName="Provider Credential"
        description="Are you sure you want to delete this credential? API keys using this credential will no longer be able to make verifications. This action cannot be undone."
        onConfirm={deleteCredential}
      />
    </>
  );
}
