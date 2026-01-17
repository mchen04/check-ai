'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ProviderCredential {
  id: string;
  name: string;
  provider: string;
}

const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

export default function CreateApiKeyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provider credentials state
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);

  // Paradigm state - default to reasoning enabled
  const [reasoningEnabled, setReasoningEnabled] = useState(true);

  // Fetch credentials when dialog opens
  useEffect(() => {
    if (open && credentials.length === 0) {
      fetchCredentials();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchCredentials = async () => {
    setIsLoadingCredentials(true);
    try {
      const response = await fetch('/api/dashboard/provider-credentials');
      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);
        // Auto-select first credential if available
        if (data.credentials?.length > 0 && !selectedCredentialId) {
          setSelectedCredentialId(data.credentials[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching credentials:', e);
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    if (!selectedCredentialId) {
      setError('Please select a provider credential');
      return;
    }

    if (!reasoningEnabled) {
      setError('At least one paradigm must be enabled');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          providerCredentialIds: [selectedCredentialId],
          paradigmConfig: {
            reasoning: {
              enabled: true,
              weight: 1.0,
              model: DEFAULT_MODEL,
            },
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create API key');
      }

      const data = await response.json();
      setNewKey(data.apiKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setName('');
    setNewKey(null);
    setError(null);
    setSelectedCredentialId(credentials[0]?.id || '');
    setReasoningEnabled(true);
    if (newKey) {
      router.refresh();
    }
  };

  const noCredentials = !isLoadingCredentials && credentials.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {!newKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key to access the Check API
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {isLoadingCredentials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : noCredentials ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        No provider credentials found
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        You need to add a provider credential (like OpenRouter, OpenAI, or Anthropic)
                        in Settings before creating an API key.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Production API Key"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate();
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Give your key a descriptive name so you can identify it later
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="credential">Provider Credential</Label>
                    <Select
                      value={selectedCredentialId}
                      onValueChange={setSelectedCredentialId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider credential" />
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
                      Select the LLM provider credential this API key will use
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Verification Method</Label>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Reasoning</p>
                        <p className="text-xs text-muted-foreground">
                          LLM-based logical analysis using {DEFAULT_MODEL}
                        </p>
                      </div>
                      <Switch
                        checked={reasoningEnabled}
                        onCheckedChange={setReasoningEnabled}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can configure additional paradigms in Settings after creation
                    </p>
                  </div>
                </>
              )}
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating || noCredentials || isLoadingCredentials}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Key'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Copy your new API key. You won&apos;t be able to see it again!
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-lg border bg-muted p-4">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  Your API Key
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-sm">
                    {newKey}
                  </code>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                <p className="text-xs text-amber-700">
                  Make sure to copy your API key now. You won&apos;t be able to see it again.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
