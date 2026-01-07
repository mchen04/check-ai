'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Key, AlertCircle, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';

// Provider configurations
const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { value: 'google', label: 'Google AI', placeholder: 'AIza...' },
  { value: 'deepseek', label: 'DeepSeek', placeholder: 'sk-...' },
  { value: 'groq', label: 'Groq', placeholder: 'gsk_...' },
  { value: 'together', label: 'Together AI', placeholder: 'your-api-key' },
  { value: 'mistral', label: 'Mistral AI', placeholder: 'your-api-key' },
  { value: 'cohere', label: 'Cohere', placeholder: 'your-api-key' },
] as const;

interface AddProviderKeyDialogProps {
  onSuccess: () => void;
  existingProviders?: string[];
}

export function AddProviderKeyDialog({ onSuccess, existingProviders = [] }: AddProviderKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const availableProviders = PROVIDERS.filter(
    (p) => !existingProviders.includes(p.value)
  );

  const selectedProvider = PROVIDERS.find((p) => p.value === provider);

  const handleCreate = async () => {
    if (!provider) {
      setError('Please select a provider');
      return;
    }

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/provider-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          name: name.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add provider key');
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add provider key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setProvider('');
      setApiKey('');
      setName('');
      setShowKey(false);
      setSuccess(false);
      setError(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={availableProviders.length === 0}>
          <Key className="mr-2 h-4 w-4" />
          Add Provider Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Key Added Successfully
              </DialogTitle>
              <DialogDescription>
                Your {selectedProvider?.label} API key has been validated and securely stored.
              </DialogDescription>
            </DialogHeader>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Provider API Key</DialogTitle>
              <DialogDescription>
                Add your own API key for an LLM provider. Keys are encrypted and stored securely.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableProviders.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    All providers already have keys configured.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={selectedProvider?.placeholder || 'Enter API key'}
                    className="pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The key will be validated with the provider before saving.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-name">Name (optional)</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`My ${selectedProvider?.label || 'Provider'} Key`}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Why add your own key?</strong> Using your own API keys gives you more
                  control over costs, rate limits, and enables access to premium models.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isLoading || !provider || !apiKey.trim()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Validating...' : 'Test & Save'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
