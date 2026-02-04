'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Pencil, Trash2 } from 'lucide-react';
import { EditApiKeyDialog } from './EditApiKeyDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ButtonSpinner, Spinner } from '@/components/ui/loading-spinner';
import { formatRelativeTime } from '@/lib/utils';

interface ProviderCredential {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
}

interface ApiKeyCredential {
  id: string;
  providerCredentialId: string;
  isDefault: boolean;
  credential: ProviderCredential | null;
}

interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
  paradigmConfig?: Record<string, { enabled: boolean; weight: number; model: string }> | null;
  defaultThresholds?: { escalateThreshold?: number } | null;
  credentials?: ApiKeyCredential[];
}

interface ApiKeysListProps {
  initialKeys: ApiKeyData[];
}

export function ApiKeysList({ initialKeys }: ApiKeysListProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editKey, setEditKey] = useState<ApiKeyData | null>(null);

  const keyToDelete = initialKeys.find((k) => k.id === deleteId);

  const deleteApiKey = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/dashboard/keys?id=${deleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete API key');
      }

      router.refresh();
    } catch {
      // Deletion errors are handled silently - UI state remains unchanged
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="divide-y">
        {initialKeys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0">
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{key.name}</p>
                  {!key.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                  {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                    <Badge variant="destructive" className="text-xs">Expired</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {key.keyPrefix}...
                  </code>
                  <span>•</span>
                  <span>Created {formatRelativeTime(key.createdAt)}</span>
                  {key.lastUsedAt && (
                    <>
                      <span>•</span>
                      <span>Last used {formatRelativeTime(key.lastUsedAt)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditKey(key)}
                aria-label={`Edit API key ${key.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(key.id)}
                disabled={isDeleting && deleteId === key.id}
                aria-label={`Delete API key ${key.name}`}
              >
                {isDeleting && deleteId === key.id ? (
                  <Spinner size="sm" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              {keyToDelete ? `"${keyToDelete.name}"` : 'this API key'}? This
              action cannot be undone. Any applications using this key will
              immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteApiKey}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <ButtonSpinner />}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editKey && (
        <EditApiKeyDialog
          apiKey={editKey}
          open={!!editKey}
          onOpenChange={(open) => !open && setEditKey(null)}
        />
      )}
    </>
  );
}
