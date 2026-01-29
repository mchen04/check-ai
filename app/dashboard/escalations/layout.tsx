import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Escalations | Check',
  description: 'Review and resolve verification escalations requiring human review.',
};

export default function EscalationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
