import { redirect } from 'next/navigation';
import { getUserOrgContext } from '@/lib/rbac';
import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Key } from 'lucide-react';
import CreateApiKeyDialog from './CreateApiKeyDialog';
import { ApiKeysList } from './ApiKeysList';

export default async function ApiKeysPage() {
  const context = await getUserOrgContext();
  if (!context) {
    redirect('/login');
  }

  // Fetch API keys for display, filtered by organization
  let apiKeys: Array<{
    id: string;
    name: string;
    keyPrefix: string;
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
        isActive: apiKeysTable.isActive,
        lastUsedAt: apiKeysTable.lastUsedAt,
        createdAt: apiKeysTable.createdAt,
        expiresAt: apiKeysTable.expiresAt,
      })
      .from(apiKeysTable)
      .where(eq(apiKeysTable.orgId, context.orgId))
      .orderBy(desc(apiKeysTable.createdAt))
      .limit(50);

    apiKeys = keys;
  } catch {
    // Database errors are handled silently - empty state will be shown
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">API Keys</h1>
        <CreateApiKeyDialog />
      </div>

      {/* Security Notice */}
      <AlertBanner
        variant="warning"
        size="sm"
        title="Keep your API keys secure"
        className="mb-6"
      >
        Never share them publicly or commit them to version control.
      </AlertBanner>

      {/* API Keys List */}
      <Card className="mb-6">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Your API Keys</h3>
          <span className="text-xs text-muted-foreground">{apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="p-4">
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Key className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="mb-1 text-sm font-medium">No API keys yet</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Create your first API key to start using the Check API
              </p>
              <CreateApiKeyDialog />
            </div>
          ) : (
            <ApiKeysList initialKeys={apiKeys} />
          )}
        </div>
      </Card>

      {/* BYOK Section */}
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>Bring Your Own Keys (BYOK)</span>
          <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <Card className="mt-3">
          <div className="p-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Use your own API keys from providers like OpenAI, Anthropic, and Google. Keys are encrypted with AES-256-GCM.
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
        </Card>
      </details>
    </div>
  );
}
