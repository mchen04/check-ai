'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  Key,
  PlayCircle,
  Shield,
  X,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react';
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
  hasCreatedApiKey: boolean;
  hasVisitedPlayground: boolean;
  hasRunVerification: boolean;
}

export function OnboardingChecklist({
  hasCreatedApiKey,
  hasVisitedPlayground,
  hasRunVerification,
}: OnboardingChecklistProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const steps: OnboardingStep[] = [
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
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Get Started with Check</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete these steps to start verifying content
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            disabled={isDismissing}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount}/{steps.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-4 rounded-lg border p-3 transition-colors ${
                step.completed
                  ? 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  step.completed
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.completed ? 'text-green-700 dark:text-green-400' : ''
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!step.completed && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
