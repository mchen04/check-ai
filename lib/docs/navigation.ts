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
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'Overview', href: '/docs/api-reference/overview' },
      { title: 'Verify Content', href: '/docs/api-reference/verify' },
      { title: 'Get Verification', href: '/docs/api-reference/get-verification' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Webhooks', href: '/docs/webhooks' },
      { title: 'Error Handling', href: '/docs/errors' },
      { title: 'Rate Limiting', href: '/docs/rate-limiting' },
    ],
  },
];

export function getDocNavigation() {
  return docsNavigation;
}

export function flattenNavigation(nav: NavItem[]): NavItem[] {
  return nav.flatMap((item) => {
    if (item.items) {
      return flattenNavigation(item.items);
    }
    return [item];
  });
}

export function findNavItem(href: string): NavItem | undefined {
  const flat = flattenNavigation(docsNavigation);
  return flat.find((item) => item.href === href);
}

export function findAdjacentDocs(href: string): { prev?: NavItem; next?: NavItem } {
  const flat = flattenNavigation(docsNavigation);
  const index = flat.findIndex((item) => item.href === href);

  return {
    prev: index > 0 ? flat[index - 1] : undefined,
    next: index < flat.length - 1 ? flat[index + 1] : undefined,
  };
}
