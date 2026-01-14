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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Key,
  MoreHorizontal,
  Trash2,
  Loader2,
  Plus,
  Copy,
  Check,
  ChevronDown,
  Settings2,
  Eye,
  EyeOff,
  Pencil,
} from 'lucide-react';

// Paradigm configurations
const PARADIGMS = [
  { key: 'reasoning', label: 'Reasoning', description: 'LLM-based logical analysis' },
  { key: 'tool', label: 'Tool Use', description: 'External tool verification' },
  { key: 'semantic', label: 'Semantic', description: 'Embedding similarity' },
  { key: 'ensemble', label: 'Ensemble', description: 'Multi-model voting' },
  { key: 'biprm', label: 'BiPRM', description: 'Bidirectional process reward' },
  { key: 'entropy', label: 'Entropy', description: 'Token probability analysis' },
  { key: 'formal', label: 'Formal', description: 'Formal verification logic' },
] as const;

const DEFAULT_MODELS: Record<string, string> = {
  reasoning: 'anthropic/claude-3.5-sonnet',
  tool: 'openai/gpt-4o-mini',
  semantic: 'openai/text-embedding-3-small',
  biprm: 'anthropic/claude-3.5-sonnet',
  entropy: 'openai/gpt-4o-mini',
  formal: 'openai/gpt-4o',
};

const AVAILABLE_MODELS = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/text-embedding-3-small',
  'google/gemini-2.0-flash',
  'google/gemini-1.5-pro',
  'meta-llama/llama-3.3-70b',
  'groq/llama-3.3-70b',
  'mistral/mistral-large',
  'deepseek/deepseek-chat',
];

// Models available for ensemble voting
const ENSEMBLE_MODELS = [
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { id: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'meta-llama/llama-3.3-70b', label: 'Llama 3.3 70B' },
  { id: 'mistral/mistral-large', label: 'Mistral Large' },
];

interface ProviderCredential {
  id: string;
  name: string;
  provider: string;
}

interface ParadigmConfig {
  enabled: boolean;
  weight: number;
  model: string;
  models?: string[];
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  providerCredentialId: string | null;
  providerCredential: ProviderCredential | null;
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    providerCredentialId: '',
    paradigmConfig: {} as Record<string, ParadigmConfig>,
    defaultThresholds: {
      acceptThreshold: 0.95,
      escalateThreshold: 0.5,
      timeout: 30000,
    },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedParadigms, setExpandedParadigms] = useState(false);

  // Edit state
  const [editKey, setEditKey] = useState<ApiKey | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    providerCredentialId: '',
    paradigmConfig: {} as Record<string, ParadigmConfig>,
    defaultThresholds: {
      acceptThreshold: 0.95,
      escalateThreshold: 0.5,
      timeout: 30000,
    },
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editExpandedParadigms, setEditExpandedParadigms] = useState(true);

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

  const toggleParadigm = (paradigm: string, enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      paradigmConfig: {
        ...prev.paradigmConfig,
        [paradigm]: {
          enabled,
          weight: prev.paradigmConfig[paradigm]?.weight || 0.5,
          model: prev.paradigmConfig[paradigm]?.model || DEFAULT_MODELS[paradigm] || '',
        },
      },
    }));
  };

  const updateParadigmWeight = (paradigm: string, weight: number) => {
    setFormData((prev) => ({
      ...prev,
      paradigmConfig: {
        ...prev.paradigmConfig,
        [paradigm]: {
          ...prev.paradigmConfig[paradigm],
          weight,
        },
      },
    }));
  };

  const updateParadigmModel = (paradigm: string, model: string) => {
    setFormData((prev) => ({
      ...prev,
      paradigmConfig: {
        ...prev.paradigmConfig,
        [paradigm]: {
          ...prev.paradigmConfig[paradigm],
          model,
        },
      },
    }));
  };

  const toggleEnsembleModel = (modelId: string, checked: boolean) => {
    setFormData((prev) => {
      const currentModels = prev.paradigmConfig['ensemble']?.models || [];
      const newModels = checked
        ? [...currentModels, modelId]
        : currentModels.filter((m) => m !== modelId);
      return {
        ...prev,
        paradigmConfig: {
          ...prev.paradigmConfig,
          ensemble: {
            ...prev.paradigmConfig['ensemble'],
            enabled: prev.paradigmConfig['ensemble']?.enabled || false,
            weight: prev.paradigmConfig['ensemble']?.weight || 0.5,
            model: '', // Not used for ensemble
            models: newModels,
          },
        },
      };
    });
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!formData.providerCredentialId) {
      setFormError('Provider credential is required');
      return;
    }

    const enabledParadigms = Object.entries(formData.paradigmConfig).filter(
      ([, config]) => config.enabled
    );
    if (enabledParadigms.length === 0) {
      setFormError('At least one paradigm must be enabled');
      return;
    }

    // Validate ensemble has at least 2 models
    if (formData.paradigmConfig['ensemble']?.enabled) {
      const ensembleModels = formData.paradigmConfig['ensemble']?.models || [];
      if (ensembleModels.length < 2) {
        setFormError('Ensemble requires at least 2 models for voting');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/dashboard/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setFormError(data.error || 'Failed to create API key');
        return;
      }

      const data = await response.json();
      setNewApiKey(data.apiKey);
      fetchData();
    } catch (error) {
      setFormError('Failed to create API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setNewApiKey(null);
    setShowKey(false);
    setFormData({
      name: '',
      providerCredentialId: '',
      paradigmConfig: {},
      defaultThresholds: {
        acceptThreshold: 0.95,
        escalateThreshold: 0.5,
        timeout: 30000,
      },
    });
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
    setEditFormData({
      name: key.name,
      providerCredentialId: key.providerCredentialId || '',
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

  const toggleEditParadigm = (paradigm: string, enabled: boolean) => {
    setEditFormData((prev) => ({
      ...prev,
      paradigmConfig: {
        ...prev.paradigmConfig,
        [paradigm]: {
          enabled,
          weight: prev.paradigmConfig[paradigm]?.weight || 0.5,
          model: prev.paradigmConfig[paradigm]?.model || DEFAULT_MODELS[paradigm] || '',
        },
      },
    }));
  };

  const updateEditParadigmWeight = (paradigm: string, weight: number) => {
    setEditFormData((prev) => ({
      ...prev,
      paradigmConfig: {
        ...prev.paradigmConfig,
        [paradigm]: {
          ...prev.paradigmConfig[paradigm],
          weight,
        },
      },
    }));
  };

  const updateEditParadigmModel = (paradigm: string, model: string) => {
    setEditFormData((prev) => ({
      ...prev,
      paradigmConfig: {
        ...prev.paradigmConfig,
        [paradigm]: {
          ...prev.paradigmConfig[paradigm],
          model,
        },
      },
    }));
  };

  const toggleEditEnsembleModel = (modelId: string, checked: boolean) => {
    setEditFormData((prev) => {
      const currentModels = prev.paradigmConfig['ensemble']?.models || [];
      const newModels = checked
        ? [...currentModels, modelId]
        : currentModels.filter((m) => m !== modelId);
      return {
        ...prev,
        paradigmConfig: {
          ...prev.paradigmConfig,
          ensemble: {
            ...prev.paradigmConfig['ensemble'],
            enabled: prev.paradigmConfig['ensemble']?.enabled || false,
            weight: prev.paradigmConfig['ensemble']?.weight || 0.5,
            model: '', // Not used for ensemble
            models: newModels,
          },
        },
      };
    });
  };

  const handleEditSubmit = async () => {
    if (!editKey) return;
    setEditError(null);

    if (!editFormData.name.trim()) {
      setEditError('Name is required');
      return;
    }
    if (!editFormData.providerCredentialId) {
      setEditError('Provider credential is required');
      return;
    }

    const enabledParadigms = Object.entries(editFormData.paradigmConfig).filter(
      ([, config]) => config.enabled
    );
    if (enabledParadigms.length === 0) {
      setEditError('At least one paradigm must be enabled');
      return;
    }

    // Validate ensemble has at least 2 models
    if (editFormData.paradigmConfig['ensemble']?.enabled) {
      const ensembleModels = editFormData.paradigmConfig['ensemble']?.models || [];
      if (ensembleModels.length < 2) {
        setEditError('Ensemble requires at least 2 models for voting');
        return;
      }
    }

    setIsEditSubmitting(true);

    try {
      const response = await fetch(`/api/dashboard/keys?id=${editKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          providerCredentialId: editFormData.providerCredentialId,
          paradigmConfig: editFormData.paradigmConfig,
          defaultThresholds: editFormData.defaultThresholds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setEditError(data.error || 'Failed to update API key');
        return;
      }

      setEditKey(null);
      fetchData();
    } catch (error) {
      setEditError('Failed to update API key');
    } finally {
      setIsEditSubmitting(false);
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

  const getParadigmSummary = (config: Record<string, ParadigmConfig> | null) => {
    if (!config) return 'No paradigms configured';
    const enabled = Object.entries(config)
      .filter(([, c]) => c.enabled)
      .map(([p, c]) => `${p} (${(c.weight * 100).toFixed(0)}%)`);
    return enabled.length > 0 ? enabled.join(', ') : 'No paradigms configured';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <CardTitle>API Keys</CardTitle>
            </div>
            {canEdit && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={credentials.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="icon" onClick={copyKey}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                        {/* Basic Info */}
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            placeholder="e.g., Production, Fast Screening"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="credential">Provider Credential</Label>
                          <Select
                            value={formData.providerCredentialId}
                            onValueChange={(value) =>
                              setFormData({ ...formData, providerCredentialId: value })
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

                        {/* Paradigm Configuration */}
                        <Collapsible open={expandedParadigms} onOpenChange={setExpandedParadigms}>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              <span className="flex items-center gap-2">
                                <Settings2 className="h-4 w-4" />
                                Paradigm Configuration
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${expandedParadigms ? 'rotate-180' : ''}`}
                              />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 pt-3">
                            {PARADIGMS.map((paradigm) => (
                              <div
                                key={paradigm.key}
                                className="rounded-lg border p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{paradigm.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {paradigm.description}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={formData.paradigmConfig[paradigm.key]?.enabled || false}
                                    onCheckedChange={(checked) =>
                                      toggleParadigm(paradigm.key, checked)
                                    }
                                  />
                                </div>
                                {formData.paradigmConfig[paradigm.key]?.enabled && (
                                  <div className="space-y-2 pt-2 border-t">
                                    <div className="flex items-center justify-between text-sm">
                                      <span>Weight</span>
                                      <span>
                                        {((formData.paradigmConfig[paradigm.key]?.weight || 0) * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <Slider
                                      value={[(formData.paradigmConfig[paradigm.key]?.weight || 0.5) * 100]}
                                      onValueChange={([value]) =>
                                        updateParadigmWeight(paradigm.key, value / 100)
                                      }
                                      max={100}
                                      step={5}
                                    />
                                    {paradigm.key === 'ensemble' ? (
                                      <div className="space-y-2">
                                        <Label className="text-xs">Models for voting</Label>
                                        <div className="space-y-2">
                                          {ENSEMBLE_MODELS.map((model) => (
                                            <div key={model.id} className="flex items-center space-x-2">
                                              <Checkbox
                                                id={`create-ensemble-${model.id}`}
                                                checked={formData.paradigmConfig['ensemble']?.models?.includes(model.id) || false}
                                                onCheckedChange={(checked) =>
                                                  toggleEnsembleModel(model.id, checked === true)
                                                }
                                              />
                                              <label
                                                htmlFor={`create-ensemble-${model.id}`}
                                                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                              >
                                                {model.label}
                                              </label>
                                            </div>
                                          ))}
                                        </div>
                                        {(formData.paradigmConfig['ensemble']?.models?.length || 0) < 2 && (
                                          <p className="text-xs text-amber-600">Select at least 2 models for voting</p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <Label className="text-xs">Model</Label>
                                        <Select
                                          value={
                                            formData.paradigmConfig[paradigm.key]?.model ||
                                            DEFAULT_MODELS[paradigm.key]
                                          }
                                          onValueChange={(value) =>
                                            updateParadigmModel(paradigm.key, value)
                                          }
                                        >
                                          <SelectTrigger className="h-8 text-sm">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {AVAILABLE_MODELS.map((model) => (
                                              <SelectItem key={model} value={model}>
                                                {model}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Default Thresholds */}
                        <div className="space-y-3 rounded-lg border p-4">
                          <div className="font-medium">Default Thresholds</div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Accept Threshold</span>
                                <span>{((formData.defaultThresholds?.acceptThreshold || 0.95) * 100).toFixed(0)}%</span>
                              </div>
                              <Slider
                                value={[(formData.defaultThresholds?.acceptThreshold || 0.95) * 100]}
                                onValueChange={([value]) =>
                                  setFormData({
                                    ...formData,
                                    defaultThresholds: {
                                      ...formData.defaultThresholds,
                                      acceptThreshold: value / 100,
                                    },
                                  })
                                }
                                max={100}
                                min={50}
                                step={1}
                              />
                              <p className="text-xs text-muted-foreground">Auto-approve above this confidence</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>Escalate Threshold</span>
                                <span>{((formData.defaultThresholds?.escalateThreshold || 0.5) * 100).toFixed(0)}%</span>
                              </div>
                              <Slider
                                value={[(formData.defaultThresholds?.escalateThreshold || 0.5) * 100]}
                                onValueChange={([value]) =>
                                  setFormData({
                                    ...formData,
                                    defaultThresholds: {
                                      ...formData.defaultThresholds,
                                      escalateThreshold: value / 100,
                                    },
                                  })
                                }
                                max={100}
                                min={0}
                                step={1}
                              />
                              <p className="text-xs text-muted-foreground">Human review below this confidence</p>
                            </div>
                          </div>
                        </div>

                        {formError && (
                          <div className="text-sm text-destructive">{formError}</div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>
                          Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
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
                        <Badge variant="secondary">
                          {key.providerCredential.name}
                        </Badge>
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
                                <Loader2 className="h-4 w-4 animate-spin" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure API Key</DialogTitle>
            <DialogDescription>
              Update the configuration for this API key.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>

            {/* Provider Credential */}
            <div className="space-y-2">
              <Label htmlFor="edit-credential">Provider Credential</Label>
              <Select
                value={editFormData.providerCredentialId}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, providerCredentialId: value })
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

            {/* Paradigm Configuration */}
            <Collapsible open={editExpandedParadigms} onOpenChange={setEditExpandedParadigms}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Paradigm Configuration
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${editExpandedParadigms ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                {PARADIGMS.map((paradigm) => (
                  <div
                    key={paradigm.key}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{paradigm.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {paradigm.description}
                        </div>
                      </div>
                      <Switch
                        checked={editFormData.paradigmConfig[paradigm.key]?.enabled || false}
                        onCheckedChange={(checked) =>
                          toggleEditParadigm(paradigm.key, checked)
                        }
                      />
                    </div>
                    {editFormData.paradigmConfig[paradigm.key]?.enabled && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span>Weight</span>
                          <span>
                            {((editFormData.paradigmConfig[paradigm.key]?.weight || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Slider
                          value={[(editFormData.paradigmConfig[paradigm.key]?.weight || 0.5) * 100]}
                          onValueChange={([value]) =>
                            updateEditParadigmWeight(paradigm.key, value / 100)
                          }
                          max={100}
                          step={5}
                        />
                        {paradigm.key === 'ensemble' ? (
                          <div className="space-y-2">
                            <Label className="text-xs">Models for voting</Label>
                            <div className="space-y-2">
                              {ENSEMBLE_MODELS.map((model) => (
                                <div key={model.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`edit-ensemble-${model.id}`}
                                    checked={editFormData.paradigmConfig['ensemble']?.models?.includes(model.id) || false}
                                    onCheckedChange={(checked) =>
                                      toggleEditEnsembleModel(model.id, checked === true)
                                    }
                                  />
                                  <label
                                    htmlFor={`edit-ensemble-${model.id}`}
                                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {model.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                            {(editFormData.paradigmConfig['ensemble']?.models?.length || 0) < 2 && (
                              <p className="text-xs text-amber-600">Select at least 2 models for voting</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Label className="text-xs">Model</Label>
                            <Select
                              value={
                                editFormData.paradigmConfig[paradigm.key]?.model ||
                                DEFAULT_MODELS[paradigm.key]
                              }
                              onValueChange={(value) =>
                                updateEditParadigmModel(paradigm.key, value)
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_MODELS.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Default Thresholds */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="font-medium">Default Thresholds</div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Accept Threshold</span>
                    <span>{((editFormData.defaultThresholds?.acceptThreshold || 0.95) * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[(editFormData.defaultThresholds?.acceptThreshold || 0.95) * 100]}
                    onValueChange={([value]) =>
                      setEditFormData({
                        ...editFormData,
                        defaultThresholds: {
                          ...editFormData.defaultThresholds,
                          acceptThreshold: value / 100,
                        },
                      })
                    }
                    max={100}
                    min={50}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Auto-approve above this confidence</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Escalate Threshold</span>
                    <span>{((editFormData.defaultThresholds?.escalateThreshold || 0.5) * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[(editFormData.defaultThresholds?.escalateThreshold || 0.5) * 100]}
                    onValueChange={([value]) =>
                      setEditFormData({
                        ...editFormData,
                        defaultThresholds: {
                          ...editFormData.defaultThresholds,
                          escalateThreshold: value / 100,
                        },
                      })
                    }
                    max={100}
                    min={0}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Human review below this confidence</p>
                </div>
              </div>
            </div>

            {editError && (
              <div className="text-sm text-destructive">{editError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditKey(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isEditSubmitting}>
              {isEditSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this API key? All requests using this key will fail.
              This action cannot be undone.
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
