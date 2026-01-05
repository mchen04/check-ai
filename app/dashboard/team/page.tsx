import { redirect } from 'next/navigation';
import { getUserOrgContext } from '@/lib/rbac/get-user-org';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage your organization members and invitations
          </p>
        </div>
        {canInvite && <InviteMemberDialog />}
      </div>

      {/* Pro Plan Gate */}
      {context.organization.planType === 'free' && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <Users className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                Team management is available on Pro plan
              </p>
              <p className="text-sm text-amber-700">
                Upgrade to invite team members, assign roles, and collaborate.
              </p>
            </div>
            <Button asChild>
              <Link href="/subscribe">Upgrade to Pro</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? 's' : ''} in{' '}
            {context.organization.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role as keyof typeof ROLE_ICONS];
              const isCurrentUser = member.id === context.userId;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <span className="text-sm font-medium">
                        {member.name?.charAt(0)?.toUpperCase() ||
                          member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {member.name || 'Unknown'}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <Badge
                          variant="secondary"
                          className={ROLE_COLORS[member.role as keyof typeof ROLE_COLORS]}
                        >
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Joined{' '}
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
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border border-dashed p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{invite.role}</Badge>
                        <span>
                          Expires{' '}
                          {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canManageRoles && (
                    <PendingInviteActions inviteId={invite.id} email={invite.email} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Descriptions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <span className="font-medium">Owner</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Full access. Can delete organization, manage billing, and transfer ownership.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Admin</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Can manage members, API keys, and all features except billing.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-green-600" />
                <span className="font-medium">Member</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Can use API, create keys, view dashboard, and resolve escalations.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Viewer</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Read-only access to dashboard, verifications, and usage data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
