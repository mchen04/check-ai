export interface NavItem {
  title: string;
  href?: string;
  items?: NavItem[];
}

export const docsNavigation: NavItem[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs/introduction' },
      { title: 'Quickstart', href: '/docs/quickstart' },
      { title: 'Authentication', href: '/docs/authentication' },
      { title: 'Verification Methods', href: '/docs/paradigms' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Overview', href: '/docs/api-reference/overview' },
      { title: 'Verify Content', href: '/docs/api-reference/verify' },
      { title: 'Get Verification', href: '/docs/api-reference/get-verification' },
      { title: 'Create Batch', href: '/docs/api-reference/batch/create-batch' },
      { title: 'List Batches', href: '/docs/api-reference/batch/list-batches' },
      { title: 'Get Batch', href: '/docs/api-reference/batch/get-batch' },
      { title: 'Get Results', href: '/docs/api-reference/batch/get-results' },
      { title: 'Cancel Batch', href: '/docs/api-reference/batch/cancel-batch' },
      { title: 'Upload File', href: '/docs/api-reference/batch/upload-file' },
      { title: 'File Formats', href: '/docs/api-reference/batch/file-formats' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Dashboard', href: '/docs/dashboard' },
      { title: 'Webhooks', href: '/docs/webhooks' },
      { title: 'Error Handling', href: '/docs/errors' },
      { title: 'Rate Limiting', href: '/docs/rate-limiting' },
      { title: 'Environment Variables', href: '/docs/environment-variables' },
    ],
  },
];

// Internal helper to flatten navigation tree
function flattenNavigation(nav: NavItem[]): NavItem[] {
  return nav.flatMap((item) => {
    if (item.items) {
      return flattenNavigation(item.items);
    }
    return [item];
  });
}

export function findAdjacentDocs(href: string): { prev?: NavItem; next?: NavItem } {
  const flat = flattenNavigation(docsNavigation);
  const index = flat.findIndex((item) => item.href === href);

  return {
    prev: index > 0 ? flat[index - 1] : undefined,
    next: index < flat.length - 1 ? flat[index + 1] : undefined,
  };
}
