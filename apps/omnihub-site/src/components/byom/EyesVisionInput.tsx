/**
 * EyesVisionInput — multimodal vision attach control for the Connect AI
 * (BYOM) surface.
 *
 * Adds an image attach control to a prompt input: file picker (image/*),
 * client-side validation (type + 5MB cap), preview thumbnail, remove button,
 * and safe states for unsupported/oversized files. On send it routes the image
 * + prompt through the EXISTING `byom-proxy` edge function as Anthropic-native
 * multimodal content blocks.
 *
 * SECURITY: image bytes are never logged. Only the {@link describeImagePayload}
 * metadata (media type + size) is ever surfaced to the console.
 */
import { useCallback, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
// The pure vision core lives in the root package `src/lib` (the Vite `@` alias
// → apps/omnihub-site/src does not cover it), so import it by relative path —
// the same convention OmniSentryPanel uses for `src/lib/omni-sentry`.
import {
  validateImageFile,
  buildVisionMessage,
  stripDataUrlPrefix,
  describeImagePayload,
  isAcceptedImageType,
  type AcceptedImageType,
} from '../../../../src/lib/eyes-vision';

interface AttachedImage {
  readonly dataUrl: string;
  readonly mediaType: AcceptedImageType;
  readonly name: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function EyesVisionInput() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState('');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const result = validateImageFile(file);
    if (!result.ok) {
      setError(result.message ?? 'That file cannot be used.');
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      // Narrow the already-validated MIME type for the typed payload.
      if (!isAcceptedImageType(file.type)) {
        setError('Unsupported file type.');
        return;
      }
      setImage({ dataUrl, mediaType: file.type, name: file.name });
    } catch {
      setError('Could not read the selected image.');
    }
  }, []);

  const removeImage = useCallback(() => {
    setImage(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSend = useCallback(async () => {
    if (!image) {
      setError('Attach an image to analyze.');
      return;
    }
    setError('');
    setIsSending(true);
    setResponse('');

    try {
      const message = buildVisionMessage({
        prompt: prompt.trim() || 'Describe this image.',
        mediaType: image.mediaType,
        base64Data: stripDataUrlPrefix(image.dataUrl),
      });

      // Metadata-only log — NEVER the bytes.
      console.info('[APEX OmniHub] Eyes vision send:', describeImagePayload(message.content[0] as never));

      const provider = sessionStorage.getItem('omni_ai_provider') === 'groq' ? 'groq' : 'anthropic';

      const { data, error: fnError } = await supabase.functions.invoke('byom-proxy', {
        body: {
          provider,
          model: provider === 'anthropic' ? 'claude-sonnet-4-5' : 'llama-3.1-8b-instant',
          messages: [message],
        },
      });

      if (fnError) throw new Error(fnError.message || 'Vision request failed');
      // byom-proxy streams SSE; supabase-js returns the raw text body here.
      setResponse(typeof data === 'string' ? data : JSON.stringify(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vision request failed');
    } finally {
      setIsSending(false);
    }
  }, [image, prompt]);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-elevated)',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--color-border)',
        maxWidth: '640px',
      }}
    >
      <h3 style={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: '12px' }}>
        Eyes — Vision Input
      </h3>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '0.875rem', lineHeight: 1.5 }}>
        Attach an image (PNG, JPEG, WebP, or GIF, up to 5 MB) and ask a question. The image is sent
        through your connected provider; APEX never logs the bytes.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
            marginBottom: '16px',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Attach image"
      />

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {image ? 'Replace image' : 'Attach image'}
        </button>
        {image && (
          <button
            type="button"
            onClick={removeImage}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Remove
          </button>
        )}
      </div>

      {image && (
        <div style={{ marginBottom: '16px' }}>
          <img
            src={image.dataUrl}
            alt={`Preview of ${image.name}`}
            style={{
              maxWidth: '160px',
              maxHeight: '160px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask about the image…"
        rows={3}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          fontSize: '1rem',
          marginBottom: '16px',
          resize: 'vertical',
        }}
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={isSending || !image}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'var(--color-accent)',
          color: 'white',
          cursor: isSending || !image ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          opacity: isSending || !image ? 0.7 : 1,
        }}
      >
        {isSending ? 'Analyzing…' : 'Analyze image'}
      </button>

      {response && (
        <pre
          style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.875rem',
          }}
        >
          {response}
        </pre>
      )}
    </div>
  );
}
