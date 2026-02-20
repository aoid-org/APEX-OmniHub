/**
 * OmniLinkReplay — Deterministic replay scrubber overlay.
 *
 * Scrubs through trace events step-by-step with play/pause/skip controls.
 * Highlights current step. Safe payload display (guards unknown).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOmniTrace, type TraceEvent } from '@/hooks/useOmniTrace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OmniLinkReplayProps {
  workflowId: string;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function OmniLinkReplay({ workflowId }: Readonly<OmniLinkReplayProps>) {
  const { traces } = useOmniTrace(workflowId);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Events sorted chronologically for replay
  const events = [...traces].reverse();
  const totalSteps = events.length;
  const currentEvent: TraceEvent | undefined = events[currentStep];

  const clearPlayback = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      clearPlayback();
    } else {
      setIsPlaying(true);
    }
  }, [isPlaying, clearPlayback]);

  useEffect(() => {
    if (!isPlaying) {
      clearPlayback();
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return clearPlayback;
  }, [isPlaying, totalSteps, clearPlayback]);

  const skipForward = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const skipBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    clearPlayback();
    setCurrentStep(0);
  }, [clearPlayback]);

  if (totalSteps === 0) {
    return (
      <Card className="glass-card rounded-2xl">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No trace events available for replay.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RotateCcw className="h-4 w-4 text-primary" />
          OmniLink Replay
          <Badge variant="secondary" className="text-[10px] ml-auto">
            Step {currentStep + 1}/{totalSteps}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scrubber */}
        <Slider
          value={[currentStep]}
          onValueChange={([v]) => setCurrentStep(v)}
          max={totalSteps - 1}
          step={1}
          className="w-full"
        />

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipBack}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipForward}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Current Event Detail */}
        {currentEvent && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  currentEvent.kind === 'tool' && 'border-blue-500/40 text-blue-600',
                  currentEvent.kind === 'model' && 'border-purple-500/40 text-purple-600',
                  currentEvent.kind === 'policy' && 'border-amber-500/40 text-amber-600',
                )}
              >
                {currentEvent.kind}
              </Badge>
              <span className="text-sm font-medium">{currentEvent.name}</span>
              {currentEvent.latency_ms !== null && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {currentEvent.latency_ms}ms
                </span>
              )}
            </div>
            <pre className="text-[11px] font-mono bg-muted/50 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all">
              {safeStringify(currentEvent.data_redacted)}
            </pre>
          </div>
        )}

        {/* Timeline visualization */}
        <div className="flex gap-0.5 items-center">
          {events.map((event, idx) => (
            <button
              key={event.id}
              className={cn(
                'h-2 flex-1 rounded-full transition-all cursor-pointer',
                idx < currentStep && 'bg-primary/60',
                idx === currentStep && 'bg-primary scale-y-150',
                idx > currentStep && 'bg-muted',
              )}
              onClick={() => setCurrentStep(idx)}
              title={event.name}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
