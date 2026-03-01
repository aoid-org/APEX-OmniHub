import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Languages, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SemanticTranslator } from '@/omniconnect/translation/translator';
import { CanonicalEvent } from '@/omniconnect/types/canonical';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useI18n, LOCALES, type LangCode } from '@/i18n';

const LOCALE_OPTIONS: { value: LangCode; labelKey: string }[] = LOCALES.map((code) => ({
  value: code,
  labelKey: `locale.${code}`,
}));

/**
 * Translation Page - User-facing translation UI
 * Uses existing SemanticTranslator engine (client-side)
 * Read-only, no external API calls
 */
export default function Translation() {
  const { t } = useI18n();
  const [inputJson, setInputJson] = useState('');
  const [targetLocale, setTargetLocale] = useState<LangCode>('fr');
  const [translatedResult, setTranslatedResult] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleTranslate = async () => {
    try {
      // Parse input JSON
      const parsed = JSON.parse(inputJson);

      // Convert to CanonicalEvent format (partial for translation preview)
      const event = {
        eventId: crypto.randomUUID(),
        eventType: parsed.eventType || 'custom',
        timestamp: new Date().toISOString(),
        source: parsed.source || 'omnilink-ui',
        payload: parsed.payload || parsed,
        metadata: parsed.metadata || {},
      } as unknown as CanonicalEvent;

      // Create translator instance
      const translator = new SemanticTranslator();

      // Translate (client-side, deterministic)
      const result = await translator.translate([event], 'omnilink-ui', crypto.randomUUID(), targetLocale);

      // Check translation status
      const translatedEvent = result[0];
      if (translatedEvent.metadata.risk_lane === 'RED') {
        setStatus('error');
        setErrorMessage(
          translatedEvent.payload._error as string || 'Translation verification failed'
        );
        setTranslatedResult(JSON.stringify(translatedEvent, null, 2));
      } else {
        setStatus('success');
        setTranslatedResult(JSON.stringify(translatedEvent, null, 2));
        toast.success(t('translation.completeWithVerification'));
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Invalid JSON');
      toast.error(t('translation.translationFailed'));
    }
  };

  const handleClear = () => {
    setInputJson('');
    setTranslatedResult('');
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t('translation.title')}</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              {t('translation.semanticTitle')}
            </CardTitle>
            <CardDescription>
              {t('translation.semanticDescription')}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('translation.inputTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locale">{t('translation.targetLocale')}</Label>
              <Select value={targetLocale} onValueChange={(v) => setTargetLocale(v as LangCode)}>
                <SelectTrigger id="locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="input">{t('translation.jsonPayload')}</Label>
              <Textarea
                id="input"
                placeholder={t('translation.jsonPlaceholder')}
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                className="font-mono text-sm min-h-[120px]"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTranslate} disabled={!inputJson}>
                {t('translation.translate')}
              </Button>
              <Button variant="outline" onClick={handleClear}>
                {t('translation.clear')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result Section */}
        {translatedResult && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('translation.resultTitle')}</CardTitle>
                {status === 'success' && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('translation.verified')}
                  </Badge>
                )}
                {status === 'error' && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    {t('translation.failed')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === 'error' && errorMessage && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('translation.translatedEvent')}</Label>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-[400px] overflow-y-auto">
                    {translatedResult}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(translatedResult);
                      toast.success(t('translation.copiedToClipboard'));
                    }}
                  >
                    {t('translation.copy')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Notice */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">{t('translation.previewMode')}</p>
                <p className="text-xs">
                  {t('translation.previewDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
