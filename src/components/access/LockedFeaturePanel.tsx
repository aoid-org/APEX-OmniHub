/**
 * LockedFeaturePanel - Deterministic UX for Locked Features
 * 
 * Displays a clear, actionable panel when a feature is locked.
 * No dead controls. Always provides a path forward.
 * 
 * @example
 * <LockedFeaturePanel
 *   featureId="legacy.dashboard"
 *   title="Dashboard"
 *   reason="Requires authentication"
 *   showLogin={true}
 * />
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, PlayCircle, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LockedFeaturePanelProps {
  readonly featureId: string;
  readonly title: string;
  readonly reason: string;
  readonly showLogin?: boolean;
  readonly showExploreDemo?: boolean;
  readonly customActions?: React.ReactNode;
}

export const LockedFeaturePanel: React.FC<LockedFeaturePanelProps> = ({
  featureId,
  title,
  reason,
  showLogin = false,
  showExploreDemo = false,
  customActions,
}) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/auth', { state: { returnTo: globalThis.location.pathname } });
  };

  const handleExploreDemo = () => {
    // Enable demo mode and redirect
    globalThis.localStorage.setItem('apex.demo.enabled', 'true');
    globalThis.location.reload();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-dashed border-yellow-500/30 bg-yellow-500/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
            <Lock className="h-8 w-8 text-yellow-500" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">
            This feature is currently locked
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{reason}</AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            {showLogin && (
              <Button onClick={handleLogin} className="w-full" size="lg">
                <LogIn className="mr-2 h-4 w-4" />
                Log In to Access
              </Button>
            )}

            {showExploreDemo && (
              <Button
                onClick={handleExploreDemo}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Explore Demo Mode
              </Button>
            )}

            {customActions}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleGoBack}
                variant="ghost"
                className="flex-1"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button
                onClick={handleGoHome}
                variant="ghost"
                className="flex-1"
                size="sm"
              >
                Return Home
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Feature ID: <code className="rounded bg-muted px-1">{featureId}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LockedFeaturePanel;
