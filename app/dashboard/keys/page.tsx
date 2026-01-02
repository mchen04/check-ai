import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Copy, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CreateApiKeyDialog from './CreateApiKeyDialog';

export default async function ApiKeysPage() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/login');
  }

  // Fetch API keys for display
  // Note: In production, this would filter by orgId
  let apiKeys: Array<{
    id: string;
    name: string;
    keyPrefix: string;
    provider: string;
    isActive: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
    expiresAt: Date | null;
  }> = [];

  try {
    const keys = await db
      .select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        provider: apiKeysTable.provider,
        isActive: apiKeysTable.isActive,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
        expiresAt: apiKeysTable.expiresAt,
      })
      .from(apiKeysTable)
      .orderBy(desc(apiKeysTable.createdAt))
      .limit(50);

    apiKeys = keys;
  } catch (e) {
    console.log('Error fetching API keys:', e);
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for accessing the VerifyAI API
          </p>
        </div>
        <CreateApiKeyDialog />
      </div>

      {/* Security Notice */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Keep your API keys secure</p>
            <p className="text-sm text-amber-700">
              API keys grant access to your account. Never share them publicly or commit them to version control.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            {apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''} created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="mb-2 text-sm font-medium">No API keys yet</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Create your first API key to start using the VerifyAI API
              </p>
              <CreateApiKeyDialog />
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Key className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{key.name}</p>
                        {!key.isActive && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                        {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {key.keyPrefix}...
                        </code>
                        <span>•</span>
                        <span className="capitalize">{key.provider}</span>
                        <span>•</span>
                        <span>
                          Created{' '}
                          {formatDistanceToNow(new Date(key.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {key.lastUsedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Last used{' '}
                              {formatDistanceToNow(new Date(key.lastUsedAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BYOK Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Bring Your Own Keys (BYOK)</CardTitle>
          <CardDescription>
            Use your own API keys for LLM providers to avoid platform token costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4">
            <p className="mb-4 text-sm text-muted-foreground">
              With BYOK, you can use your own API keys from providers like OpenAI, Anthropic, and Google.
              Your keys are encrypted with AES-256-GCM and never stored in plain text.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">OpenAI</Badge>
              <Badge variant="outline">Anthropic</Badge>
              <Badge variant="outline">Google AI</Badge>
              <Badge variant="outline">DeepSeek</Badge>
              <Badge variant="outline">Groq</Badge>
              <Badge variant="outline">Together</Badge>
              <Badge variant="outline">Mistral</Badge>
              <Badge variant="outline">Cohere</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
