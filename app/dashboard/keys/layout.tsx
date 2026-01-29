import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Keys | Check',
  description: 'Manage your API keys and access credentials.',
};

export default function KeysLayout({ children }: { children: React.ReactNode }) {
  return children;
}
