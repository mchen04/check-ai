import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Batch Jobs | Check',
  description: 'Manage your batch verification jobs and monitor processing progress.',
};

export default function BatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
