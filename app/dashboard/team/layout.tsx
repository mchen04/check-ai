import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team | Check',
  description: 'Manage team members and invitations for your organization.',
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
