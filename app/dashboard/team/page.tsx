import { redirect } from 'next/navigation';
import { Users, Crown, Shield, User, Eye, Mail, Clock } from 'lucide-react';
import Link from 'next/link';
import { eq, and, desc } from 'drizzle-orm';
import { getUserOrgContext } from '@/lib/rbac';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/utils/db/db';
import { orgMembersTable, usersTable, orgInvitesTable } from '@/utils/db/schema';
import { formatRelativeTime } from '@/lib/utils';
import { InviteMemberDialog } from './InviteMemberDialog';
import { TeamMemberActions } from './TeamMemberActions';
import { PendingInviteActions } from './PendingInviteActions';

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const ROLE_COLORS = {
  owner: 'bg-warning/10 text-warning',
  admin: 'bg-primary/10 text-primary',
  member: 'bg-success/10 text-success',
  viewer: 'bg-muted text-muted-foreground',
};

export default async function TeamPage() {
  const context = await getUserOrgContext();

  if (!context) {
    redirect('/login');
  }

  // Fetch members
  const members = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: orgMembersTable.role,
      joinedAt: orgMembersTable.createdAt,
    })
    .from(orgMembersTable)
    .innerJoin(usersTable, eq(orgMembersTable.userId, usersTable.id))
    .where(eq(orgMembersTable.orgId, context.orgId))
    .orderBy(desc(orgMembersTable.createdAt));

  // Fetch pending invites
  const pendingInvites = await db
    .select({
      id: orgInvitesTable.id,
      email: orgInvitesTable.email,
      role: orgInvitesTable.role,
      invitedAt: orgInvitesTable.createdAt,
      expiresAt: orgInvitesTable.expiresAt,
    })
    .from(orgInvitesTable)
    .where(
      and(eq(orgInvitesTable.orgId, context.orgId), eq(orgInvitesTable.status, 'pending'))
    )
    .orderBy(desc(orgInvitesTable.createdAt));

  const canInvite =
    context.organization.planType !== 'free' &&
    (context.role === 'owner' || context.role === 'admin');

  const canManageRoles = context.role === 'owner' || context.role === 'admin';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Team</h1>
        {canInvite && <InviteMemberDialog />}
      </div>

      {/* Pro Plan Gate */}
      {context.organization.planType === 'free' && (
        <Card className="mb-6 border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="flex-1 text-sm text-amber-800">
              <span className="font-medium">Pro plan required</span>
              <span className="text-amber-700"> to invite team members</span>
            </p>
            <Button size="sm" asChild>
              <Link href="/subscribe">Upgrade</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Members List */}
      <Card className="mb-6">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Team Members</h3>
          <span className="text-xs text-muted-foreground">
            {members.length} in {context.organization.name}
          </span>
        </div>
        <div className="p-4">
          <div className="divide-y">
            {members.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role as keyof typeof ROLE_ICONS];
              const isCurrentUser = member.id === context.userId;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                      <span className="text-xs font-medium">
                        {member.name?.charAt(0)?.toUpperCase() ||
                          member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {member.name || 'Unknown'}
                          {isCurrentUser && (
                            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`${ROLE_COLORS[member.role as keyof typeof ROLE_COLORS]} text-xs px-1.5 py-0`}
                        >
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(member.joinedAt)}
                    </span>
                    {canManageRoles && !isCurrentUser && member.role !== 'owner' && (
                      <TeamMemberActions
                        userId={member.id}
                        currentRole={member.role}
                        memberName={member.name || member.email}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Pending Invitations</h3>
            </div>
            <span className="text-xs text-muted-foreground">{pendingInvites.length} pending</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-md border border-dashed px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{invite.role}</Badge>
                        <span>Expires {formatRelativeTime(invite.expiresAt)}</span>
                      </div>
                    </div>
                  </div>
                  {canManageRoles && (
                    <PendingInviteActions inviteId={invite.id} email={invite.email} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Role Descriptions */}
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>Role Permissions</span>
          <svg className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <Card className="mt-3">
          <div className="p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Owner</span>
                </div>
                <p className="text-xs text-muted-foreground">Full access including billing.</p>
              </div>
              <div className="rounded-md border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Admin</span>
                </div>
                <p className="text-xs text-muted-foreground">Manage members and features.</p>
              </div>
              <div className="rounded-md border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Member</span>
                </div>
                <p className="text-xs text-muted-foreground">Use API and create keys.</p>
              </div>
              <div className="rounded-md border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Viewer</span>
                </div>
                <p className="text-xs text-muted-foreground">Read-only dashboard access.</p>
              </div>
            </div>
          </div>
        </Card>
      </details>
    </div>
  );
}
