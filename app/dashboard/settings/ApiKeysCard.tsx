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
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Pencil,
} from 'lucide-react';
import { LoadingState, LoadingSpinner, ButtonSpinner } from '@/components/ui/loading-spinner';
import { InlineError } from '@/components/ui/empty-state';
import { formatDate } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks';
import {
  useParadigmConfig,
  getParadigmSummary,
  type ParadigmConfig,
} from './hooks/useParadigmConfig';
import { ParadigmConfigForm } from './components/ParadigmConfigForm';

interface ProviderCredential {
  id: string;
  name: string;
  provider: string;
}

interface ApiKeyCredential {
  id: string;
  providerCredentialId: string;
  isDefault: boolean;
  credential: ProviderCredential | null;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  providerCredential: ProviderCredential | null;
  credentials?: ApiKeyCredential[];
  paradigmConfig: Record<string, ParadigmConfig> | null;
  defaultThresholds: {
    acceptThreshold?: number;
    escalateThreshold?: number;
    timeout?: number;
  } | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface ApiKeysCardProps {
  canEdit: boolean;
}

export function ApiKeysCard({ canEdit }: ApiKeysCardProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Create dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard();
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedParadigms, setExpandedParadigms] = useState(false);

  // Edit dialog state
  const [editKey, setEditKey] = useState<ApiKey | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editExpandedParadigms, setEditExpandedParadigms] = useState(true);

  // Form hooks
  const createForm = useParadigmConfig();
  const editForm = useParadigmConfig();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [keysRes, credsRes] = await Promise.all([
        fetch('/api/dashboard/keys'),
        fetch('/api/dashboard/provider-credentials'),
      ]);

      if (keysRes.ok) {
        const data = await keysRes.json();
        setKeys(data.keys);
      }

      if (credsRes.ok) {
        const data = await credsRes.json();
        setCredentials(data.credentials);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    const error = createForm.validate();
    if (error) {
      setFormError(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/dashboard/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm.formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setFormError(data.error || 'Failed to create API key');
        return;
      }

      const data = await response.json();
      setNewApiKey(data.apiKey);
      fetchData();
    } catch {
      setFormError('Failed to create API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyKey = () => {
    if (newApiKey) {
      copy(newApiKey);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setNewApiKey(null);
    setShowKey(false);
    createForm.reset();
    setFormError(null);
  };

  const deleteKey = async () => {
    if (!deleteId) return;

    setActionLoading(deleteId);
    try {
      const response = await fetch(`/api/dashboard/keys?id=${deleteId}`, {
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

  const openEditDialog = (key: ApiKey) => {
    setEditKey(key);
    // Extract credential IDs from the credentials array
    const credentialIds = key.credentials?.map((c) => c.providerCredentialId) || [];
    const defaultCredId = key.credentials?.find((c) => c.isDefault)?.providerCredentialId;
    editForm.reset({
      name: key.name,
      providerCredentialIds: credentialIds.length > 0 ? credentialIds : (key.providerCredential ? [key.providerCredential.id] : []),
      defaultCredentialId: defaultCredId,
      paradigmConfig: key.paradigmConfig || {},
      defaultThresholds: {
        acceptThreshold: key.defaultThresholds?.acceptThreshold ?? 0.95,
        escalateThreshold: key.defaultThresholds?.escalateThreshold ?? 0.5,
        timeout: key.defaultThresholds?.timeout ?? 30000,
      },
    });
    setEditError(null);
    setEditExpandedParadigms(true);
  };

  const handleEditSubmit = async () => {
    if (!editKey) return;
    setEditError(null);

    // For edit, we only validate name and paradigm config (credentials can't be changed)
    if (!editForm.formData.name.trim()) {
      setEditError('Name is required');
      return;
    }

    const enabledParadigms = Object.entries(editForm.formData.paradigmConfig).filter(
      ([, config]) => config.enabled
    );
    if (enabledParadigms.length === 0) {
      setEditError('At least one paradigm must be enabled');
      return;
    }

    setIsEditSubmitting(true);

    try {
      const response = await fetch(`/api/dashboard/keys?id=${editKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.formData.name,
          paradigmConfig: editForm.formData.paradigmConfig,
          defaultThresholds: editForm.formData.defaultThresholds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setEditError(data.error || 'Failed to update API key');
        return;
      }

      setEditKey(null);
      fetchData();
    } catch {
      setEditError('Failed to update API key');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-6 w-6 shrink-0 text-muted-foreground" />
              <CardTitle>API Keys</CardTitle>
            </div>
            {canEdit && (
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}
              >
                <DialogTrigger asChild>
                  <Button size="sm" disabled={credentials.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                  {newApiKey ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>API Key Created</DialogTitle>
                        <DialogDescription>
                          Copy your API key now. You will not be able to see it again.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="flex items-center gap-2">
                          <Input
                            type={showKey ? 'text' : 'password'}
                            value={newApiKey}
                            readOnly
                            className="font-mono"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowKey(!showKey)}
                          >
                            {showKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="outline" size="icon" onClick={copyKey}>
                            {copied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={closeDialog}>Done</Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle>Create API Key</DialogTitle>
                        <DialogDescription>
                          Create a new API key with verification configuration.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            placeholder="e.g., Production, Fast Screening"
                            value={createForm.formData.name}
                            onChange={(e) => createForm.updateField('name', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="credential">Provider Credential</Label>
                          <Select
                            value={createForm.formData.providerCredentialIds[0] || ''}
                            onValueChange={(value) =>
                              createForm.updateField('providerCredentialIds', [value])
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select credential" />
                            </SelectTrigger>
                            <SelectContent>
                              {credentials.map((cred) => (
                                <SelectItem key={cred.id} value={cred.id}>
                                  {cred.name} ({cred.provider})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <ParadigmConfigForm
                          paradigmConfig={createForm.formData.paradigmConfig}
                          defaultThresholds={createForm.formData.defaultThresholds}
                          expanded={expandedParadigms}
                          onExpandedChange={setExpandedParadigms}
                          onToggleParadigm={createForm.toggleParadigm}
                          onUpdateWeight={createForm.updateParadigmWeight}
                          onUpdateModel={createForm.updateParadigmModel}
                          onToggleEnsembleModel={createForm.toggleEnsembleModel}
                          onUpdateThreshold={createForm.updateThreshold}
                          idPrefix="create-"
                        />

                        <InlineError message={formError} />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>
                          Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting && <ButtonSpinner />}
                          Create Key
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
          <CardDescription>
            Each API key has its own verification configuration. Create different keys for
            different use cases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState height="sm" />
          ) : credentials.length === 0 ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Add a provider credential first before creating API keys.
              </p>
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                No API keys created. Create one to start making verifications.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Paradigms</TableHead>
                  <TableHead>Last Used</TableHead>
                  {canEdit && <TableHead className="w-[70px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {key.keyPrefix}...
                    </TableCell>
                    <TableCell>
                      {key.providerCredential ? (
                        <Badge variant="secondary">{key.providerCredential.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {getParadigmSummary(key.paradigmConfig)}
                    </TableCell>
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
                                <LoadingSpinner size="sm" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(key)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Configure
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editKey} onOpenChange={(open) => !open && setEditKey(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure API Key</DialogTitle>
            <DialogDescription>
              Update the configuration for this API key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.formData.name}
                onChange={(e) => editForm.updateField('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-credential">Provider Credential</Label>
              <Select
                value={editForm.formData.providerCredentialIds[0] || ''}
                disabled
              >
                <SelectTrigger className="bg-muted">
                  <SelectValue placeholder="Select credential" />
                </SelectTrigger>
                <SelectContent>
                  {credentials.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      {cred.name} ({cred.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Provider credential cannot be changed after creation. Create a new API key to use a different credential.
              </p>
            </div>

            <ParadigmConfigForm
              paradigmConfig={editForm.formData.paradigmConfig}
              defaultThresholds={editForm.formData.defaultThresholds}
              expanded={editExpandedParadigms}
              onExpandedChange={setEditExpandedParadigms}
              onToggleParadigm={editForm.toggleParadigm}
              onUpdateWeight={editForm.updateParadigmWeight}
              onUpdateModel={editForm.updateParadigmModel}
              onToggleEnsembleModel={editForm.toggleEnsembleModel}
              onUpdateThreshold={editForm.updateThreshold}
              idPrefix="edit-"
            />

            <InlineError message={editError} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditKey(null)}>
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
        itemName="API Key"
        description="Are you sure you want to delete this API key? All requests using this key will fail. This action cannot be undone."
        onConfirm={deleteKey}
      />
    </>
  );
}
