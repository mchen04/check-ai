import { redirect } from 'next/navigation';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, Shield, User, Eye, Mail, Clock } from 'lucide-react';
import Link from 'next/link';
import { InviteMemberDialog } from './InviteMemberDialog';
import { TeamMemberActions } from './TeamMemberActions';
import { PendingInviteActions } from './PendingInviteActions';
import { db } from '@/utils/db/db';
import { orgMembersTable, usersTable, orgInvitesTable } from '@/utils/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const ROLE_COLORS = {
  owner: 'bg-amber-100 text-amber-800',
  admin: 'bg-blue-100 text-blue-800',
  member: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
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
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold">Team</h1>
        {canInvite && <InviteMemberDialog />}
      </div>

      {/* Pro Plan Gate */}
      {context.organization.planType === 'free' && (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-800">Team management requires Pro plan</p>
              <p className="text-[10px] text-amber-700">Upgrade to invite members and collaborate.</p>
            </div>
            <Button size="sm" className="h-7 text-xs" asChild>
              <Link href="/subscribe">Upgrade</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Members List */}
      <Card className="mb-4">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h3 className="text-xs font-semibold">Team Members</h3>
          <span className="text-[10px] text-muted-foreground">
            {members.length} in {context.organization.name}
          </span>
        </div>
        <div className="p-2">
          <div className="space-y-1">
            {members.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role as keyof typeof ROLE_ICONS];
              const isCurrentUser = member.id === context.userId;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                      <span className="text-[10px] font-medium">
                        {member.name?.charAt(0)?.toUpperCase() ||
                          member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium">
                          {member.name || 'Unknown'}
                          {isCurrentUser && (
                            <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <Badge
                          variant="secondary"
                          className={`${ROLE_COLORS[member.role as keyof typeof ROLE_COLORS]} text-[9px] px-1 py-0 h-4`}
                        >
                          <RoleIcon className="mr-0.5 h-2.5 w-2.5" />
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
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
        <Card className="mb-4">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              <h3 className="text-xs font-semibold">Pending Invitations</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">{pendingInvites.length} pending</span>
          </div>
          <div className="p-2">
            <div className="space-y-1">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-md border border-dashed px-2 py-2"
                >
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{invite.email}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{invite.role}</Badge>
                        <span>Expires {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}</span>
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

      {/* Role Descriptions - Collapsible */}
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
          <span>Role Permissions</span>
          <svg className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <Card className="mt-2">
          <div className="p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border p-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <Crown className="h-3 w-3 text-amber-600" />
                  <span className="text-xs font-medium">Owner</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Full access including billing.</p>
              </div>
              <div className="rounded-md border p-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium">Admin</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Manage members and features.</p>
              </div>
              <div className="rounded-md border p-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium">Member</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Use API and create keys.</p>
              </div>
              <div className="rounded-md border p-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <Eye className="h-3 w-3 text-gray-600" />
                  <span className="text-xs font-medium">Viewer</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Read-only dashboard access.</p>
              </div>
            </div>
          </div>
        </Card>
      </details>
    </div>
  );
}
