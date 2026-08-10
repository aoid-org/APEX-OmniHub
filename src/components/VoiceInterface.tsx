import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { AudioRecorder, encodeAudioForAPI, playAudioData, clearAudioQueue } from '@/utils/RealtimeAudio';
import { calculateBackoffDelay } from '@/lib/backoff';
import { logAnalyticsEvent } from '@/lib/monitoring';
import { supabase } from '@/lib/supabase';

interface VoiceInterfaceProps {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

// ⚡ Bolt: Wrapped VoiceInterface in React.memo() to prevent unnecessary re-renders
const VoiceInterface: React.FC<VoiceInterfaceProps> = memo(({ onTranscript, onSpeakingChange }) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [degradedMode, setDegradedMode] = useState(false);
  const [degradedReason, setDegradedReason] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userEndedRef = useRef(false);
  // Ref mirror so closures always read the current retry count without stale captures
  const reconnectAttemptsRef = useRef(0);

  const MAX_RETRIES = Number(import.meta.env.VITE_VOICE_MAX_RETRIES ?? 3);
  const BASE_RETRY_MS = Number(import.meta.env.VITE_VOICE_RETRY_BASE_MS ?? 500);
  const MAX_RETRY_MS = Number(import.meta.env.VITE_VOICE_RETRY_MAX_MS ?? 10_000);
  const JITTER_MS = Number(import.meta.env.VITE_VOICE_RETRY_JITTER_MS ?? 250);
  const WS_URL = (() => {
    if (import.meta.env.VITE_VOICE_WS_URL) return import.meta.env.VITE_VOICE_WS_URL as string;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!supabaseUrl) throw new Error('[VoiceInterface] VITE_SUPABASE_URL is not set');
    return `${supabaseUrl.replace(/^https?/, 'wss')}/functions/v1/apex-voice`;
  })();

  const cleanupTimers = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (networkCheckIntervalRef.current) {
      clearInterval(networkCheckIntervalRef.current);
      networkCheckIntervalRef.current = null;
    }
  };

  const startNetworkRecoveryCheck = () => {
    if (networkCheckIntervalRef.current) return;
    
    networkCheckIntervalRef.current = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && degradedMode && !userEndedRef.current) {
        // Network recovered, attempt reconnection
        logAnalyticsEvent('voice.ws.network_recovered', {});
        setDegradedMode(false);
        reconnectAttemptsRef.current = 0;
        startConversation();
      }
    }, 5_000); // Check every 5 seconds
  };

  const cleanupTransport = () => {
    recorderRef.current?.stop();
    wsRef.current?.close();
    clearAudioQueue();
  };

  const handleDegraded = (message: string) => {
    setDegradedMode(true);
    setDegradedReason(message);
    setIsConnecting(false);
    setIsConnected(false);
    toast({
      title: 'Voice unavailable',
      description: message,
      variant: 'destructive',
    });
    logAnalyticsEvent('voice.ws.degraded', { message });
    startNetworkRecoveryCheck(); // Start checking for network recovery
  };

  const startConversation = async () => {
    userEndedRef.current = false;
    setDegradedMode(false);
    setDegradedReason(null);
    reconnectAttemptsRef.current = 0;
    setIsConnecting(true);
    cleanupTimers();
    await connectVoice(false);
  };

  const scheduleReconnect = (reason: string) => {
    if (userEndedRef.current) return;
    // Increment first via ref (avoids stale closure on state), then gate on MAX_RETRIES
    const nextAttempt = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = nextAttempt;
    if (nextAttempt >= MAX_RETRIES) {
      // Exhausted all retries — enter degraded mode
      handleDegraded(reason);
      return;
    }
    const delay = calculateBackoffDelay(nextAttempt, {
      baseMs: BASE_RETRY_MS,
      maxMs: MAX_RETRY_MS,
      jitterMs: JITTER_MS,
    });
    setIsConnecting(true);
    reconnectTimeoutRef.current = setTimeout(() => {
      connectVoice(true);
    }, delay);
    toast({
      title: 'Retrying voice connection',
      description: `Attempt ${nextAttempt}/${MAX_RETRIES} in ${Math.round(delay)}ms`,
    });
    logAnalyticsEvent('voice.ws.retry.attempt', {
      attempt: nextAttempt,
      delay,
    });
  };

  const connectVoice = async (isReconnect: boolean) => {
    try {
      // Request microphone access only if we haven't already
      if (!audioContextRef.current) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      // Authenticate the WebSocket upgrade: browsers cannot send an
      // Authorization header on WS connections, so the Supabase access
      // token is passed via the `token` query parameter and verified
      // server-side (verifyWebSocketAuth) before the upgrade completes.
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        handleDegraded('Sign in required to use voice.');
        logAnalyticsEvent('voice.ws.auth_missing', {});
        return;
      }
      const wsUrl = `${WS_URL}${WS_URL.includes('?') ? '&' : '?'}token=${encodeURIComponent(accessToken)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        cleanupTimers(); // Clears network check interval too
        setIsConnected(true);
        setIsConnecting(false);
        setDegradedMode(false);
        setDegradedReason(null);
        logAnalyticsEvent('voice.ws.retry.success', { reconnect: isReconnect });

        recorderRef.current = new AudioRecorder((audioData: Float32Array) => {
          if (ws.readyState === WebSocket.OPEN) {
            const encoded = encodeAudioForAPI(audioData);
            ws.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encoded
            }));
          }
        });
        
        await recorderRef.current.start();

        toast({
          title: 'Voice Active',
          description: isReconnect ? 'Reconnected to voice service.' : 'APEX is listening...',
        });
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'response.audio.delta' && audioContextRef.current) {
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.codePointAt(i)!;
            }
            await playAudioData(audioContextRef.current, bytes);
          } else if (data.type === 'response.audio_transcript.delta') {
            onTranscript?.(data.delta, false);
          } else if (data.type === 'response.audio_transcript.done') {
            onTranscript?.(data.transcript, true);
          } else if (data.type === 'input_audio_buffer.speech_started') {
            // User started speaking
          } else if (data.type === 'input_audio_buffer.speech_stopped') {
            // User stopped speaking
          } else if (data.type === 'response.audio.done') {
            onSpeakingChange?.(false);
          } else if (data.type === 'response.created') {
            onSpeakingChange?.(true);
          } else if (data.type === 'error') {
            logAnalyticsEvent('voice.ws.error', { error: data.error?.message || 'Unknown error' });
            toast({
              title: 'Voice error',
              description: data.error.message || 'An error occurred',
              variant: 'destructive',
            });
          }
        } catch (error) {
          logAnalyticsEvent('voice.ws.message_error', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };

      ws.onerror = (_error) => {
        logAnalyticsEvent('voice.ws.error', { error: 'WebSocket error' });
        setIsConnecting(false);
        cleanupTransport();
        scheduleReconnect('Voice service unavailable. Retrying...');
        toast({
          title: 'Connection Error',
          description: 'Attempting to reconnect to voice service…',
          variant: 'destructive',
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        recorderRef.current?.stop();
        clearAudioQueue();
        if (!userEndedRef.current) {
          scheduleReconnect('Voice connection dropped. Retrying...');
        }
      };
    } catch (error) {
      logAnalyticsEvent('voice.ws.start_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsConnecting(false);
      cleanupTransport();
      scheduleReconnect('Voice start failed. Retrying...');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start voice conversation',
        variant: 'destructive',
      });
    }
  };

  const endConversation = useCallback(() => {
    userEndedRef.current = true;
    cleanupTimers();
    cleanupTransport();
    audioContextRef.current?.close();
    audioContextRef.current = null;
    recorderRef.current = null;
    wsRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    onSpeakingChange?.(false);
  }, [onSpeakingChange]);

  useEffect(() => {
    return () => {
      userEndedRef.current = true;
      cleanupTimers();
      endConversation();
    };
  }, [endConversation]);

  return (
    <div className="flex flex-col gap-3">
      {degradedMode && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="font-semibold">Voice connection degraded</div>
          <div className="text-destructive/80">
            {degradedReason ?? 'Voice service is currently unavailable.'}
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={startConversation} variant="default">
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast({
              title: 'Fallback',
              description: 'Use manual call or offline mode.',
            })}>
              Use fallback (manual call)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => toast({
              title: 'Offline mode',
              description: 'Continuing without live voice.',
            })}>
              Continue offline
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Button 
            onClick={endConversation}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <MicOff className="h-5 w-5" />
            End Voice Chat
          </Button>
        ) : (
          <Button 
            onClick={startConversation}
            disabled={isConnecting}
            variant="default"
            size="lg"
            className="gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                {degradedMode ? 'Retry Voice' : 'Start Voice Chat'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
});

export default VoiceInterface;
