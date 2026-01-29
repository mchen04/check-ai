import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verification History | Check',
  description: 'View and manage your verification history and results.',
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
