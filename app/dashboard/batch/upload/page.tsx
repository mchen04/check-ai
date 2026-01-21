'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Spinner } from '@/components/ui/loading-spinner';
import { getErrorMessage } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface UploadResult {
  fileId: string;
  originalFileName: string;
  format: string;
  itemCount: number;
  validationErrors: { row: number; error: string }[];
  expiresAt: string;
}

interface MethodConfig {
  semantic: number;
  reasoning: number;
  tool: number;
  biprm: number;
  ensemble: number;
  entropy: number;
  formal: number;
}

interface OptionsState {
  showAdvanced: boolean;
  acceptThreshold: number;
  escalateThreshold: number;
  minConfidence: number;
  maxRetries: number;
  retryOnLowConfidence: boolean;
}

const DEFAULT_OPTIONS: OptionsState = {
  showAdvanced: false,
  acceptThreshold: 0.95,
  escalateThreshold: 0.5,
  minConfidence: 0.8,
  maxRetries: 0,
  retryOnLowConfidence: false,
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function BatchUploadPage() {
  const router = useRouter();

  // Form state
  const [batchName, setBatchName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [methods, setMethods] = useState<MethodConfig>({
    semantic: 0.3,
    reasoning: 0.3,
    tool: 0.2,
    biprm: 0.1,
    ensemble: 0.1,
    entropy: 0,
    formal: 0,
  });
  const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTIONS);

  // Loading states
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['text/csv', 'application/json', 'text/plain'];
    const validExtensions = ['.csv', '.json'];
    const hasValidExtension = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!validTypes.includes(selectedFile.type) && !hasValidExtension) {
      setError('Please upload a CSV or JSON file');
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setUploadResult(null);

    // Auto-upload
    await uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload: File) => {
    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await fetch('/api/dashboard/batch/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Upload failed');
      }

      setUploadResult(data);

      // Auto-fill batch name from filename
      if (!batchName) {
        const nameWithoutExt = fileToUpload.name.replace(/\.[^/.]+$/, '');
        setBatchName(nameWithoutExt);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed'));
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMethodChange = (method: keyof MethodConfig, value: number[]) => {
    setMethods((prev) => ({
      ...prev,
      [method]: value[0],
    }));
  };

  const buildOptionsConfig = (): Record<string, unknown> | undefined => {
    if (!options.showAdvanced) return undefined;

    const config: Record<string, unknown> = {};

    if (options.acceptThreshold !== DEFAULT_OPTIONS.acceptThreshold) {
      config.acceptThreshold = options.acceptThreshold;
    }
    if (options.escalateThreshold !== DEFAULT_OPTIONS.escalateThreshold) {
      config.escalateThreshold = options.escalateThreshold;
    }
    if (options.maxRetries > 0) {
      config.maxRetries = options.maxRetries;
    }
    if (options.retryOnLowConfidence) {
      config.minConfidence = options.minConfidence;
      config.retryOnLowConfidence = true;
    }

    return Object.keys(config).length > 0 ? config : undefined;
  };

  const handleSubmit = async () => {
    if (!uploadResult) {
      setError('Please upload a file first');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const optionsConfig = buildOptionsConfig();
      const body: Record<string, unknown> = {
        name: batchName || uploadResult.originalFileName,
        fileId: uploadResult.fileId,
        methods,
      };
      if (optionsConfig) {
        body.options = optionsConfig;
      }

      const response = await fetch('/api/dashboard/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create batch');
      }

      // Redirect to batch detail page
      router.push(`/dashboard/batch/${data.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create batch'));
    } finally {
      setIsCreating(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadResult(null);
    setError(null);
  };

  const totalWeight = Object.values(methods).reduce((sum, w) => sum + w, 0);
  const isWeightValid = Math.abs(totalWeight - 1) < 0.01;

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/batch')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Create Batch Job</h1>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />
          <p className="flex-1">{error}</p>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* File Upload */}
        <Card>
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Upload File</h3>
            <p className="text-xs text-muted-foreground">CSV or JSON (max 100 items, 10MB)</p>
          </div>
          <div className="p-4">
            {!file ? (
              <div className="relative">
                <input type="file" accept=".csv,.json" onChange={handleFileChange} className="absolute inset-0 cursor-pointer opacity-0" />
                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-muted-foreground/50">
                  <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop file or click to browse</p>
                  <p className="text-xs text-muted-foreground">CSV and JSON supported</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md bg-muted p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUploading ? <Spinner size="xs" className="h-4 w-4 text-blue-500" /> : uploadResult ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : null}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFile}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
                {uploadResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{uploadResult.format.toUpperCase()}</Badge>
                      <span className="text-sm"><strong>{uploadResult.itemCount}</strong> items</span>
                    </div>
                    {uploadResult.validationErrors.length > 0 && (
                      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                        <p className="text-sm font-medium text-yellow-800">{uploadResult.validationErrors.length} warning(s)</p>
                        <ul className="mt-2 space-y-1 text-xs text-yellow-700">
                          {uploadResult.validationErrors.slice(0, 3).map((err, i) => (<li key={i}>Row {err.row}: {err.error}</li>))}
                          {uploadResult.validationErrors.length > 3 && <li>...{uploadResult.validationErrors.length - 3} more</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Batch Settings */}
        <Card>
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Batch Settings</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchName" className="text-sm">Batch Name (optional)</Label>
              <Input id="batchName" placeholder="Enter a name" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Methods</Label>
                <span className={`text-xs ${isWeightValid ? 'text-green-600' : 'text-red-600'}`}>Total: {(totalWeight * 100).toFixed(0)}%</span>
              </div>
              {Object.entries(methods).map(([method, weight]) => (
                <div key={method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm capitalize">{method}</Label>
                    <span className="text-xs text-muted-foreground">{(weight * 100).toFixed(0)}%</span>
                  </div>
                  <Slider value={[weight]} onValueChange={(value) => handleMethodChange(method as keyof MethodConfig, value)} min={0} max={1} step={0.1} className="w-full" />
                </div>
              ))}
              {!isWeightValid && <p className="text-xs text-red-600">Must sum to 100%</p>}
            </div>
          </div>
        </Card>

        {/* Advanced Options - Collapsible */}
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            <span>Advanced Options</span>
            <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <Card className="mt-3">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Accept Threshold</Label>
                  <span className="font-mono text-sm">{(options.acceptThreshold * 100).toFixed(0)}%</span>
                </div>
                <Slider value={[options.acceptThreshold]} onValueChange={([value]) => setOptions(prev => ({ ...prev, acceptThreshold: value }))} min={0.5} max={1} step={0.05} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Escalate Threshold</Label>
                  <span className="font-mono text-sm">{(options.escalateThreshold * 100).toFixed(0)}%</span>
                </div>
                <Slider value={[options.escalateThreshold]} onValueChange={([value]) => setOptions(prev => ({ ...prev, escalateThreshold: value }))} min={0.1} max={0.9} step={0.05} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Max Retries</Label>
                  <span className="font-mono text-sm">{options.maxRetries}</span>
                </div>
                <Slider value={[options.maxRetries]} onValueChange={([value]) => setOptions(prev => ({ ...prev, maxRetries: value }))} min={0} max={5} step={1} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Retry on Low Confidence</Label>
                  <Switch checked={options.retryOnLowConfidence} onCheckedChange={(checked) => setOptions(prev => ({ ...prev, retryOnLowConfidence: checked }))} />
                </div>
                {options.retryOnLowConfidence && (
                  <div className="space-y-2 pl-4 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Min Confidence Target</Label>
                      <span className="font-mono text-sm">{(options.minConfidence * 100).toFixed(0)}%</span>
                    </div>
                    <Slider value={[options.minConfidence]} onValueChange={([value]) => setOptions(prev => ({ ...prev, minConfidence: value }))} min={0.5} max={0.99} step={0.01} />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </details>

        {/* File Format Help - Collapsible */}
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
            <span>File Format Help</span>
            <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <Card className="mt-3">
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">CSV</p>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{`content,context.source
"Claim to verify","Wikipedia"`}</pre>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">JSON</p>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{`[{"content": "Claim", "context": {"source": "Wiki"}}]`}</pre>
              </div>
            </div>
          </Card>
        </details>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/batch')}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!uploadResult || isCreating || !isWeightValid}>
            {isCreating ? <><Spinner size="xs" className="mr-2" />Creating...</> : <>Create ({uploadResult?.itemCount || 0} items)</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
