import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Verification ${id.slice(0, 8)}... | Check`,
    description: 'View verification details and paradigm results.',
  };
}

export default function VerificationDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
