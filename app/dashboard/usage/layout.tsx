import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Usage & Analytics | Check',
  description: 'View analytics, metrics, and usage statistics for your verifications.',
};

export default function UsageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
