import { redirect } from 'next/navigation';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';
import { db } from '@/utils/db/db';
import { apiKeysTable } from '@/utils/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, AlertCircle } from 'lucide-react';
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
  } catch (e) {
    console.error('Error fetching API keys:', e);
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold">API Keys</h1>
        <CreateApiKeyDialog />
      </div>

      {/* Security Notice - Compact */}
      <Card className="mb-4 border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
          <div>
            <p className="text-xs font-medium text-amber-800">Keep your API keys secure</p>
            <p className="text-[10px] text-amber-700">
              Never share them publicly or commit them to version control.
            </p>
          </div>
        </div>
      </Card>

      {/* API Keys List */}
      <Card className="mb-4">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h3 className="text-xs font-semibold">Your API Keys</h3>
          <span className="text-[10px] text-muted-foreground">{apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="p-2">
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Key className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="mb-1 text-xs font-medium">No API keys yet</p>
              <p className="mb-3 text-[10px] text-muted-foreground">
                Create your first API key to start using the Check API
              </p>
              <CreateApiKeyDialog />
            </div>
          ) : (
            <ApiKeysList initialKeys={apiKeys} />
          )}
        </div>
      </Card>

      {/* BYOK Section - Collapsible */}
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>Bring Your Own Keys (BYOK)</span>
          <svg className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <Card className="mt-2">
          <div className="p-3">
            <p className="mb-3 text-[10px] text-muted-foreground">
              Use your own API keys from providers like OpenAI, Anthropic, and Google. Keys are encrypted with AES-256-GCM.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">OpenAI</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Anthropic</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Google AI</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">DeepSeek</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Groq</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Together</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Mistral</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Cohere</Badge>
            </div>
          </div>
        </Card>
      </details>
    </div>
  );
}
