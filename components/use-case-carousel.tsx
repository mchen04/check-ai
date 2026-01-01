'use client';

import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfigItem {
  method: string;
  weight: string;
}

interface Config {
  title: string;
  items: ConfigItem[];
}

const configs: Config[] = [
  {
    title: 'Medical AI',
    items: [
      { method: 'BiPRM verification', weight: '60% weight' },
      { method: 'Tool-augmented check', weight: '30% weight' },
      { method: 'Semantic filter', weight: '10% weight' },
    ],
  },
  {
    title: 'Legal AI',
    items: [
      { method: 'Ensemble', weight: '50% weight' },
      { method: 'Tool', weight: '50% weight' },
    ],
  },
  {
    title: 'Support AI',
    items: [
      { method: 'Reasoning', weight: '80% weight' },
      { method: 'Semantic', weight: '20% weight' },
    ],
  },
];

export default function UseCaseCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % configs.length);
  };

  const currentConfig = configs[currentIndex];

  return (
    <div className="relative">
      {/* Card with content - fixed height */}
      <div className="flex h-[320px] flex-col rounded-lg border border-border bg-card p-8 transition-all duration-500">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold">{currentConfig.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8 rounded-full transition-all hover:bg-primary/10"
            aria-label="Next use case"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <ul className="flex-1 space-y-4">
          {currentConfig.items.map((item, i) => (
            <li key={i} className="flex items-center gap-3">
              <Check className="h-5 w-5 flex-shrink-0 text-success" />
              <div className="flex-1">
                <span className="text-sm font-medium">{item.method}</span>
                <span className="ml-2 text-xs text-muted-foreground">{item.weight}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Dots indicator */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {configs.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-border/60'
              }`}
              aria-label={`Go to ${configs[index].title}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
