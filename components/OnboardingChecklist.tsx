'use client';

import { useState, useEffect, useRef, useMemo, type ComponentType } from 'react';
import Link from 'next/link';
import { Key, PlayCircle, Shield, X, CheckCircle2, Circle, ArrowRight, Plug, type LucideProps } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { dismissOnboarding } from '@/app/dashboard/actions';

// Hoisted step config to avoid recreating objects on every render (rendering-hoist-jsx)
const STEP_CONFIGS = [
  {
    id: 'providers',
    title: 'Add providers',
    description: 'Configure AI provider credentials to enable verification',
    href: '/dashboard/providers',
    IconComponent: Plug,
  },
  {
    id: 'api-key',
    title: 'Create an API key',
    description: 'Generate your first API key to authenticate requests',
    href: '/dashboard/keys',
    IconComponent: Key,
  },
  {
    id: 'playground',
    title: 'Try the Playground',
    description: 'Test verification without writing any code',
    href: '/dashboard/playground',
    IconComponent: PlayCircle,
  },
  {
    id: 'verification',
    title: 'Run your first verification',
    description: 'Verify content via API or playground',
    href: '/dashboard/playground',
    IconComponent: Shield,
  },
] as const;

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  IconComponent: ComponentType<LucideProps>;
  completed: boolean;
}

interface OnboardingChecklistProps {
  hasAddedProvider: boolean;
  hasCreatedApiKey: boolean;
  hasVisitedPlayground: boolean;
  hasRunVerification: boolean;
}

export function OnboardingChecklist({
  hasAddedProvider,
  hasCreatedApiKey,
  hasVisitedPlayground,
  hasRunVerification,
}: OnboardingChecklistProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  // Init-once guard to prevent double dismissal in StrictMode (advanced-init-once)
  const hasAutoDismissedRef = useRef(false);

  // Memoize steps to avoid recreating array on every render (rerender-memo)
  const steps: OnboardingStep[] = useMemo(() => {
    const completionMap: Record<string, boolean> = {
      providers: hasAddedProvider,
      'api-key': hasCreatedApiKey,
      playground: hasVisitedPlayground,
      verification: hasRunVerification,
    };
    return STEP_CONFIGS.map((config) => ({
      ...config,
      completed: completionMap[config.id] ?? false,
    }));
  }, [hasAddedProvider, hasCreatedApiKey, hasVisitedPlayground, hasRunVerification]);

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  // Auto-dismiss when all steps are completed (advanced-init-once)
  useEffect(() => {
    if (allCompleted && !hasAutoDismissedRef.current) {
      hasAutoDismissedRef.current = true;
      dismissOnboarding();
      setIsDismissed(true);
    }
  }, [allCompleted]);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await dismissOnboarding();
      setIsDismissed(true);
    } catch {
      // Dismiss errors are non-critical - UI state remains unchanged
      // Error monitoring should be handled via APM at a higher level
    } finally {
      setIsDismissing(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Get Started</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {completedCount}/{steps.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            disabled={isDismissing}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
        <Progress value={progressPercent} className="mb-3 h-1.5" />
        <div className="flex gap-3">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex flex-1 items-center gap-2.5 rounded-lg border px-3 py-2 transition-all ${
                step.completed
                  ? 'border-success/30 bg-success/5'
                  : 'border-border/60 hover:border-primary/40 hover:bg-muted/50'
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  step.completed
                    ? 'bg-success/20 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${step.completed ? 'text-success' : 'text-foreground'}`}
              >
                {step.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
