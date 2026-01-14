'use client';

/**
 * Reusable Paradigm Configuration Form Component
 * Used by both Create and Edit API key dialogs
 */

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Settings2 } from 'lucide-react';
import {
  PARADIGMS,
  AVAILABLE_MODELS,
  ENSEMBLE_MODELS,
  DEFAULT_MODELS,
  type ParadigmConfig,
  type DefaultThresholds,
} from '../hooks/useParadigmConfig';

interface ParadigmConfigFormProps {
  paradigmConfig: Record<string, ParadigmConfig>;
  defaultThresholds: DefaultThresholds;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onToggleParadigm: (paradigm: string, enabled: boolean) => void;
  onUpdateWeight: (paradigm: string, weight: number) => void;
  onUpdateModel: (paradigm: string, model: string) => void;
  onToggleEnsembleModel: (modelId: string, checked: boolean) => void;
  onUpdateThreshold: (key: keyof DefaultThresholds, value: number) => void;
  idPrefix?: string;
}

export function ParadigmConfigForm({
  paradigmConfig,
  defaultThresholds,
  expanded,
  onExpandedChange,
  onToggleParadigm,
  onUpdateWeight,
  onUpdateModel,
  onToggleEnsembleModel,
  onUpdateThreshold,
  idPrefix = '',
}: ParadigmConfigFormProps) {
  return (
    <>
      {/* Paradigm Configuration */}
      <Collapsible open={expanded} onOpenChange={onExpandedChange}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Paradigm Configuration
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          {PARADIGMS.map((paradigm) => (
            <div key={paradigm.key} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{paradigm.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {paradigm.description}
                  </div>
                </div>
                <Switch
                  checked={paradigmConfig[paradigm.key]?.enabled || false}
                  onCheckedChange={(checked) => onToggleParadigm(paradigm.key, checked)}
                />
              </div>
              {paradigmConfig[paradigm.key]?.enabled && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span>Weight</span>
                    <span>
                      {((paradigmConfig[paradigm.key]?.weight || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[(paradigmConfig[paradigm.key]?.weight || 0.5) * 100]}
                    onValueChange={([value]) => onUpdateWeight(paradigm.key, value / 100)}
                    max={100}
                    step={5}
                  />
                  {paradigm.key === 'ensemble' ? (
                    <div className="space-y-2">
                      <Label className="text-xs">Models for voting</Label>
                      <div className="space-y-2">
                        {ENSEMBLE_MODELS.map((model) => (
                          <div key={model.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${idPrefix}ensemble-${model.id}`}
                              checked={
                                paradigmConfig['ensemble']?.models?.includes(model.id) ||
                                false
                              }
                              onCheckedChange={(checked) =>
                                onToggleEnsembleModel(model.id, checked === true)
                              }
                            />
                            <label
                              htmlFor={`${idPrefix}ensemble-${model.id}`}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {model.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      {(paradigmConfig['ensemble']?.models?.length || 0) < 2 && (
                        <p className="text-xs text-amber-600">
                          Select at least 2 models for voting
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Model</Label>
                      <Select
                        value={
                          paradigmConfig[paradigm.key]?.model || DEFAULT_MODELS[paradigm.key]
                        }
                        onValueChange={(value) => onUpdateModel(paradigm.key, value)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_MODELS.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Default Thresholds */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="font-medium">Default Thresholds</div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Accept Threshold</span>
              <span>{((defaultThresholds?.acceptThreshold || 0.95) * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[(defaultThresholds?.acceptThreshold || 0.95) * 100]}
              onValueChange={([value]) => onUpdateThreshold('acceptThreshold', value / 100)}
              max={100}
              min={50}
              step={1}
            />
            <p className="text-xs text-muted-foreground">Auto-approve above this confidence</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Escalate Threshold</span>
              <span>
                {((defaultThresholds?.escalateThreshold || 0.5) * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[(defaultThresholds?.escalateThreshold || 0.5) * 100]}
              onValueChange={([value]) => onUpdateThreshold('escalateThreshold', value / 100)}
              max={100}
              min={0}
              step={1}
            />
            <p className="text-xs text-muted-foreground">Human review below this confidence</p>
          </div>
        </div>
      </div>
    </>
  );
}
