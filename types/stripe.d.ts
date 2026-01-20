/**
 * Stripe Web Components TypeScript Declarations
 * Extends JSX.IntrinsicElements to include Stripe custom elements
 */

import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id'?: string;
          'publishable-key'?: string;
          'customer-session-client-secret'?: string;
        },
        HTMLElement
      >;
    }
  }
}
