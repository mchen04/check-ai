import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Usage Logs | Check',
  description: 'View detailed logs of your API usage and verification activity.',
};

export default function LogsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
