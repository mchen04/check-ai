'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';

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
  ensemble: number;
}

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
    semantic: 0.4,
    reasoning: 0.3,
    tool: 0.2,
    ensemble: 0.1,
  });

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

      const response = await fetch('/api/v1/batch/upload', {
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
      setError(err instanceof Error ? err.message : 'Upload failed');
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

  const handleSubmit = async () => {
    if (!uploadResult) {
      setError('Please upload a file first');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch('/api/v1/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: batchName || uploadResult.originalFileName,
          fileId: uploadResult.fileId,
          methods,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create batch');
      }

      // Redirect to batch detail page
      router.push(`/dashboard/batch/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
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
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/batch')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Batches
        </Button>
        <h1 className="mt-4 text-3xl font-bold">Create Batch Job</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a CSV or JSON file to process multiple verifications at once
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0"
            onClick={() => setError(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload a CSV or JSON file with your verification items (max 100 items, 10MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!file ? (
              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center hover:border-muted-foreground/50">
                  <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
                  <p className="mb-1 font-medium">Drop your file here or click to browse</p>
                  <p className="text-sm text-muted-foreground">Supports CSV and JSON formats</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Info */}
                <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    ) : uploadResult ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={clearFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Upload Result */}
                {uploadResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{uploadResult.format.toUpperCase()}</Badge>
                      <span className="text-sm">
                        <strong>{uploadResult.itemCount}</strong> items detected
                      </span>
                    </div>

                    {uploadResult.validationErrors.length > 0 && (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                        <p className="mb-2 text-sm font-medium text-yellow-800">
                          {uploadResult.validationErrors.length} validation warning(s)
                        </p>
                        <ul className="space-y-1 text-sm text-yellow-700">
                          {uploadResult.validationErrors.slice(0, 5).map((err, i) => (
                            <li key={i}>
                              Row {err.row}: {err.error}
                            </li>
                          ))}
                          {uploadResult.validationErrors.length > 5 && (
                            <li>...and {uploadResult.validationErrors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batch Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Settings</CardTitle>
            <CardDescription>Configure your batch job options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Batch Name */}
            <div className="space-y-2">
              <Label htmlFor="batchName">Batch Name (optional)</Label>
              <Input
                id="batchName"
                placeholder="Enter a name for this batch"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
              />
            </div>

            <Separator />

            {/* Methods Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Verification Methods</Label>
                <span className={`text-sm ${isWeightValid ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {(totalWeight * 100).toFixed(0)}%
                </span>
              </div>

              {Object.entries(methods).map(([method, weight]) => (
                <div key={method} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">{method}</Label>
                    <span className="text-sm text-muted-foreground">
                      {(weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[weight]}
                    onValueChange={(value) => handleMethodChange(method as keyof MethodConfig, value)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              ))}

              {!isWeightValid && (
                <p className="text-sm text-red-600">Method weights must sum to 100%</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* File Format Help */}
        <Card>
          <CardHeader>
            <CardTitle>File Format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 font-medium">CSV Format</p>
              <pre className="rounded bg-muted p-3 text-sm">
                {`content,context.source,idempotencyKey
"The claim to verify","Wikipedia",claim-001
"Another claim to check","News",claim-002`}
              </pre>
            </div>

            <Separator />

            <div>
              <p className="mb-2 font-medium">JSON Format</p>
              <pre className="rounded bg-muted p-3 text-sm">
                {`[
  {
    "content": "The claim to verify",
    "context": { "source": "Wikipedia" },
    "idempotencyKey": "claim-001"
  }
]`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/batch')}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!uploadResult || isCreating || !isWeightValid}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>Create Batch ({uploadResult?.itemCount || 0} items)</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
