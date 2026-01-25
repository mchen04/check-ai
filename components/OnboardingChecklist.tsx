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
