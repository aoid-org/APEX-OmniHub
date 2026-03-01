import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MessageSquare, Navigation } from 'lucide-react';
import VoiceInterface from '@/components/VoiceInterface';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useI18n } from '@/i18n';

interface VoiceCommand {
  pattern: RegExp;
  action: () => void;
  description: string;
}

/**
 * Agent Page - Voice interface with command mapping
 * Client-side voice commands with deterministic mapping
 * Minimal telemetry (no transcripts unless user opts in)
 */
export default function Agent() {
  const { t } = useI18n();
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  // Voice command mapping (deterministic, auditable)
  const commands: VoiceCommand[] = useMemo(() => [
    {
      pattern: /open integrations?|show integrations?|go to integrations?/i,
      action: () => navigate('/integrations'),
      description: 'Navigate to Integrations',
    },
    {
      pattern: /open (omni)?dash(board)?|show dash(board)?|go to dash(board)?/i,
      action: () => navigate('/omnidash'),
      description: 'Navigate to OmniDash',
    },
    {
      pattern: /open (omni)?trace|show trace|go to trace/i,
      action: () => navigate('/omnitrace'),
      description: 'Navigate to OmniTrace',
    },
    {
      pattern: /open translation|show translation|go to translation/i,
      action: () => navigate('/translation'),
      description: 'Navigate to Translation',
    },
    {
      pattern: /open settings|show settings|go to settings/i,
      action: () => navigate('/settings'),
      description: 'Navigate to Settings',
    },
    {
      pattern: /enable dark mode|turn on dark mode|dark mode on/i,
      action: () => {
        setTheme('dark');
        toast.success(t('agent.darkModeEnabled'));
      },
      description: 'Enable dark mode',
    },
    {
      pattern: /enable light mode|turn on light mode|light mode on/i,
      action: () => {
        setTheme('light');
        toast.success(t('agent.lightModeEnabled'));
      },
      description: 'Enable light mode',
    },
    {
      pattern: /help|what can you do|commands/i,
      action: () => {
        toast.info(t('agent.voiceCommandsAvailable'));
      },
      description: 'Show help',
    },
  ], [navigate, setTheme, t]);

  const processCommand = useCallback(
    (text: string) => {
      for (const cmd of commands) {
        if (cmd.pattern.test(text)) {
          setLastCommand(cmd.description);
          cmd.action();
          toast.success(`Command: ${cmd.description}`);
          return;
        }
      }
      // No match found
      toast(t('agent.commandNotRecognized'), {
        description: t('agent.commandHint'),
      });
    },
    [commands, t]
  );

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      setTranscript(text);
      if (isFinal) {
        processCommand(text);
      }
    },
    [processCommand]
  );

  const handleSpeakingChange = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t('agent.title')}</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Voice Interface Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  {t('agent.voiceInterfaceTitle')}
                </CardTitle>
                <CardDescription>
                  {t('agent.voiceInterfaceDescription')}
                </CardDescription>
              </div>
              {isSpeaking && (
                <Badge variant="default" className="animate-pulse">
                  {t('agent.speaking')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <VoiceInterface
              onTranscript={handleTranscript}
              onSpeakingChange={handleSpeakingChange}
            />

            {transcript && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">{t('agent.transcript')}</p>
                    <p className="text-sm text-muted-foreground">{transcript}</p>
                  </div>
                </div>
              </div>
            )}

            {lastCommand && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-start gap-2">
                  <Navigation className="w-4 h-4 mt-1 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">{t('agent.lastCommand')}</p>
                    <p className="text-sm text-primary">{lastCommand}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Commands Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('agent.availableCommands')}</CardTitle>
            <CardDescription>
              {t('agent.availableCommandsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {commands.map((cmd, idx) => (
                <div
                  key={cmd.description}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1">{cmd.description}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {cmd.pattern.source.replaceAll(/\\b|\\/g, '').replaceAll('|', ' or ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">{t('agent.privacyTitle')}</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>{t('agent.privacyVoice')}</li>
                <li>{t('agent.privacyTranscripts')}</li>
                <li>{t('agent.privacyCommands')}</li>
                <li>{t('agent.privacyNoExternal')}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
