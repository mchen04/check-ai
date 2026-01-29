import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | Check',
  description: 'Configure your organization settings, security, and preferences.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
