import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import remarkGfm from 'remark-gfm';
import { getDoc, getAllDocs, findAdjacentDocs } from '@/lib/docs';
import { mdxComponents } from '@/components/docs/MDXComponents';
import { Button } from '@/components/ui/button';

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

// Generate static params for all docs
export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slug.length > 0 ? doc.slug : undefined,
  }));
}

export async function generateMetadata({ params }: DocsPageProps) {
  const { slug } = await params;
  const docSlug = slug || ['introduction'];
  const doc = getDoc(docSlug);

  if (!doc) {
    return { title: 'Not Found | Check Docs' };
  }

  return {
    title: `${doc.frontmatter.title} | Check Docs`,
    description: doc.frontmatter.description,
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const docSlug = slug || ['introduction'];
  const doc = getDoc(docSlug);

  if (!doc) {
    notFound();
  }

  const currentPath = `/docs/${docSlug.join('/')}`;
  const { prev, next } = findAdjacentDocs(currentPath);

  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      {/* Header */}
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          {doc.frontmatter.title}
        </h1>
        {doc.frontmatter.description && (
          <p className="text-lg text-muted-foreground">
            {doc.frontmatter.description}
          </p>
        )}
      </header>

      {/* Content */}
      <div className="mdx-content">
        <MDXRemote source={doc.content} components={mdxComponents} options={{
          mdxOptions: { remarkPlugins: [remarkGfm] }
        }} />
      </div>

      {/* Navigation */}
      <nav className="mt-12 flex items-center justify-between border-t border-border pt-6">
        {prev ? (
          <Link href={prev.href!} className="group flex items-center gap-2 text-sm no-underline">
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <div>
              <p className="text-xs text-muted-foreground">Previous</p>
              <p className="font-medium text-foreground">{prev.title}</p>
            </div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link href={next.href!} className="group flex items-center gap-2 text-right text-sm no-underline">
            <div>
              <p className="text-xs text-muted-foreground">Next</p>
              <p className="font-medium text-foreground">{next.title}</p>
            </div>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </article>
  );
}
