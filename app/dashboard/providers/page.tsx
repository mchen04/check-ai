import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserOrgContext } from '@/lib/rbac';
import { ProviderCredentialsCard } from '../settings/ProviderCredentialsCard';
import { WebhooksCard } from '../settings/WebhooksCard';

export default async function ProvidersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/login');
  }

  const orgContext = await getUserOrgContext();
  if (!orgContext) {
    redirect('/login');
  }

  const canEdit = orgContext.role === 'owner' || orgContext.role === 'admin';

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-sm font-semibold">Providers</h1>
        <p className="text-xs text-muted-foreground">
          Connect your LLM provider credentials and configure webhooks
        </p>
      </div>

      <div className="space-y-4">
        <ProviderCredentialsCard canEdit={canEdit} />
        <WebhooksCard canEdit={canEdit} />
      </div>
    </div>
  );
}
