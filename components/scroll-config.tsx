'use client';

import { useEffect, useState, useRef } from 'react';
import { Check } from 'lucide-react';

interface ConfigItem {
  method: string;
  weight: string;
}

interface Config {
  title: string;
  description: string;
  items: ConfigItem[];
}

const configs: Config[] = [
  {
    title: 'Medical AI',
    description: 'High-stakes healthcare applications require maximum accuracy with bidirectional reasoning.',
    items: [
      { method: 'BiPRM verification', weight: '60% weight' },
      { method: 'Tool-augmented check', weight: '30% weight' },
      { method: 'Semantic filter', weight: '10% weight' },
    ],
  },
  {
    title: 'Legal AI',
    description: 'Legal research demands ensemble verification with external fact-checking.',
    items: [
      { method: 'Ensemble', weight: '50% weight' },
      { method: 'Tool', weight: '50% weight' },
    ],
  },
  {
    title: 'Support AI',
    description: 'Customer support balances speed and accuracy with reasoning-first verification.',
    items: [
      { method: 'Reasoning', weight: '80% weight' },
      { method: 'Semantic', weight: '20% weight' },
    ],
  },
];

export default function ScrollConfig() {
  const [activeIndex, setActiveIndex] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers = stepRefs.current.map((step, index) => {
      if (!step) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index);
          }
        },
        {
          threshold: 0.5,
          rootMargin: '-40% 0px -40% 0px',
        }
      );

      observer.observe(step);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, []);

  const activeConfig = configs[activeIndex];

  return (
    <div className="relative" style={{ margin: '10vh 0' }}>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Left side - Scrolling steps */}
        <div>
          {/* Heading */}
          <div className="mb-24">
            <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Configure for your domain
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Different industries need different verification mixes. Here&apos;s how teams configure VerifyAI.
            </p>
          </div>

          {/* Steps with large margins */}
          {configs.map((config, index) => (
            <div
              key={index}
              ref={(el) => {
                stepRefs.current[index] = el;
              }}
              style={{
                margin: '50vh 0',
                opacity: activeIndex === index ? 1 : 0.3,
                transition: 'opacity 0.3s ease'
              }}
            >
              <h3 className="mb-4 text-xl font-bold">{config.title}</h3>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          ))}
        </div>

        {/* Right side - Sticky graphic */}
        <div>
          <div className="sticky top-32" style={{ height: '60vh' }}>
            <div className="h-full rounded-lg border border-border bg-card p-8 transition-all duration-500">
              <h3 className="mb-6 text-xl font-bold">{activeConfig.title}</h3>
              <ul className="space-y-4">
                {activeConfig.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-success" />
                    <div className="flex-1">
                      <span className="font-medium text-sm">{item.method}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{item.weight}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
