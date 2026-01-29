import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Batch ${id.slice(0, 8)}... | Check`,
    description: 'View batch verification job details and results.',
  };
}

export default function BatchDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
