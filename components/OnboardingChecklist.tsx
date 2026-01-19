'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Key, PlayCircle, Shield, X, CheckCircle2, Circle, ArrowRight, Plug } from 'lucide-react';
import { dismissOnboarding } from '@/app/dashboard/actions';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
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

  const steps: OnboardingStep[] = [
    {
      id: 'providers',
      title: 'Add providers',
      description: 'Configure AI provider credentials to enable verification',
      href: '/dashboard/providers',
      icon: <Plug className="h-4 w-4" />,
      completed: hasAddedProvider,
    },
    {
      id: 'api-key',
      title: 'Create an API key',
      description: 'Generate your first API key to authenticate requests',
      href: '/dashboard/keys',
      icon: <Key className="h-4 w-4" />,
      completed: hasCreatedApiKey,
    },
    {
      id: 'playground',
      title: 'Try the Playground',
      description: 'Test verification without writing any code',
      href: '/dashboard/playground',
      icon: <PlayCircle className="h-4 w-4" />,
      completed: hasVisitedPlayground,
    },
    {
      id: 'verification',
      title: 'Run your first verification',
      description: 'Verify content via API or playground',
      href: '/dashboard/playground',
      icon: <Shield className="h-4 w-4" />,
      completed: hasRunVerification,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  // Auto-dismiss when all steps are completed
  useEffect(() => {
    if (allCompleted && !isDismissed) {
      dismissOnboarding();
      setIsDismissed(true);
    }
  }, [allCompleted, isDismissed]);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await dismissOnboarding();
      setIsDismissed(true);
    } catch (error) {
      console.error('Failed to dismiss onboarding:', error);
    } finally {
      setIsDismissing(false);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">Get Started</span>
            <span className="text-[10px] text-muted-foreground">
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
            <X className="h-3 w-3" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
        <Progress value={progressPercent} className="mb-2 h-1" />
        <div className="flex gap-2">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex flex-1 items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
                step.completed
                  ? 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  step.completed
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
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
                className={`text-[10px] font-medium ${step.completed ? 'text-green-700 dark:text-green-400' : ''}`}
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
