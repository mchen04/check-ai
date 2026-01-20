import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';
import { CodeTabs } from './CodeTabs';
import { ParameterTable } from './ParameterTable';
import { EndpointHeader } from './EndpointHeader';
import { Callout } from './Callout';

export const mdxComponents = {
  // Override default elements
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className={cn('mb-4 mt-8 scroll-m-20 text-3xl font-bold tracking-tight first:mt-0', className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className={cn('mb-3 mt-8 scroll-m-20 border-b border-border pb-2 text-2xl font-semibold tracking-tight', className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className={cn('mb-2 mt-6 scroll-m-20 text-xl font-semibold tracking-tight', className)}
      {...props}
    />
  ),
  h4: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      className={cn('mb-2 mt-4 scroll-m-20 text-lg font-semibold tracking-tight', className)}
      {...props}
    />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className={cn('mb-4 leading-7 [&:not(:first-child)]:mt-4', className)}
      {...props}
    />
  ),
  a: ({ className, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = href?.startsWith('http');
    if (isExternal) {
      return (
        <a
          className={cn('font-medium text-primary underline underline-offset-4 hover:no-underline', className)}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        />
      );
    }
    return (
      <Link
        className={cn('font-medium text-primary underline underline-offset-4 hover:no-underline', className)}
        href={href || '#'}
        {...props}
      />
    );
  },
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className={cn('my-4 ml-6 list-disc [&>li]:mt-2', className)} {...props} />
  ),
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className={cn('my-4 ml-6 list-decimal [&>li]:mt-2', className)} {...props} />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className={cn('leading-7', className)} {...props} />
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className={cn('mt-4 border-l-4 border-border pl-4 italic text-muted-foreground', className)}
      {...props}
    />
  ),
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-y-auto">
      <table className={cn('w-full', className)} {...props} />
    </div>
  ),
  tr: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className={cn('border-b border-border', className)} {...props} />
  ),
  th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className={cn('px-4 py-2 text-left font-semibold [&[align=center]]:text-center [&[align=right]]:text-right', className)}
      {...props}
    />
  ),
  td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className={cn('px-4 py-2 [&[align=center]]:text-center [&[align=right]]:text-right', className)}
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className={cn('relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm', className)}
      {...props}
    />
  ),
  pre: ({ className, children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
    // If children is a code element with a language class, extract and render with CodeBlock
    const codeElement = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
    if (codeElement?.props?.className?.startsWith('language-')) {
      const language = codeElement.props.className.replace('language-', '');
      const code = typeof codeElement.props.children === 'string'
        ? codeElement.props.children
        : '';
      return <CodeBlock code={code} language={language} />;
    }
    return (
      <pre className={cn('my-4 overflow-x-auto rounded-lg bg-muted p-4', className)} {...props}>
        {children}
      </pre>
    );
  },
  hr: ({ ...props }) => <hr className="my-8 border-border" {...props} />,

  // Custom components
  CodeBlock,
  CodeTabs,
  ParameterTable,
  EndpointHeader,
  Callout,
};

export default mdxComponents;
