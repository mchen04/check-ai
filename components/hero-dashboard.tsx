'use client';

import { useEffect, useState } from 'react';
import { XCircle, CheckCircle, Activity } from 'lucide-react';

interface Scenario {
  useCase: string;
  output: string;
  verdict: 'rejected' | 'approved';
  reasoning: string;
  confidence: number;
}

const scenarios: Scenario[] = [
  {
    useCase: 'Medical AI',
    output: 'Patient should take 500mg aspirin daily',
    verdict: 'rejected',
    reasoning: 'Dosage exceeds safe limits (max 325mg)',
    confidence: 94,
  },
  {
    useCase: 'Legal AI',
    output: 'Contract clause complies with GDPR Article 6(1)(a)',
    verdict: 'approved',
    reasoning: 'Verified against current EU regulations',
    confidence: 97,
  },
  {
    useCase: 'Support AI',
    output: 'Your refund will be processed within 3-5 business days',
    verdict: 'approved',
    reasoning: 'Matches company refund policy timeline',
    confidence: 91,
  },
];

export default function HeroDashboard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % scenarios.length);
        setIsAnimating(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const current = scenarios[currentIndex];
  const isRejected = current.verdict === 'rejected';

  return (
    <div className="rounded-xl border border-border bg-card p-6 depth-3">
      {/* Header with stats */}
      <div className="mb-5 flex items-center justify-between border-b border-border pb-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Verification
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold">1,247</span>
            <span className="text-sm text-success">+12.5%</span>
          </div>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
        <div className="text-right">
          <div className="mb-1 flex items-baseline justify-end gap-2">
            <span className="text-2xl font-bold">96.4%</span>
          </div>
          <p className="text-xs text-muted-foreground">Accuracy</p>
        </div>
      </div>

      {/* Animated verification scenario */}
      <div
        className={`transition-opacity duration-300 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}
      >
        {/* Use case label */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{current.useCase}</span>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              isRejected
                ? 'bg-destructive/10'
                : 'bg-success/10'
            }`}
          >
            {isRejected ? (
              <XCircle className="h-3 w-3 text-destructive" />
            ) : (
              <CheckCircle className="h-3 w-3 text-success" />
            )}
            <span
              className={`text-xs font-semibold ${
                isRejected ? 'text-destructive' : 'text-success'
              }`}
            >
              {isRejected ? 'Rejected' : 'Approved'}
            </span>
          </div>
        </div>

        {/* AI Output */}
        <div className="mb-4 rounded-lg bg-muted/30 p-4">
          <p className="text-sm leading-relaxed">&quot;{current.output}&quot;</p>
        </div>

        {/* Reasoning */}
        <div
          className={`rounded-lg border p-4 ${
            isRejected
              ? 'border-destructive/20 bg-destructive/5'
              : 'border-success/20 bg-success/5'
          }`}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isRejected ? 'Issue Found' : 'Verification Passed'}
          </p>
          <p className="mb-3 text-sm text-foreground">{current.reasoning}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <div className="flex-1 rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  isRejected ? 'bg-destructive' : 'bg-success'
                }`}
                style={{ width: `${current.confidence}%` }}
              ></div>
            </div>
            <span className="text-xs font-semibold">{current.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="mt-5 flex justify-center gap-2">
        {scenarios.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 rounded-full transition-all ${
              index === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-border/60'
            }`}
            aria-label={`View ${scenarios[index].useCase}`}
          />
        ))}
      </div>
    </div>
  );
}
