import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Playground | Check',
  description: 'Test and experiment with different verification methods and configurations.',
};

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return children;
}
