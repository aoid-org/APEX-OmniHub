const AUTH_MISCONFIGURED_MESSAGE = 'Authentication is misconfigured. Contact an administrator.';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

function collectErrorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object') {
    const fields = ['message', 'status', 'code', 'name'];
    return fields
      .map((field) => (error as Record<string, unknown>)[field])
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
      .join(' ');
  }

  return '';
}

export function isInvalidLoginCredentials(error: unknown): boolean {
  const normalized = collectErrorText(error).toLowerCase();
  return (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid_credentials') ||
    normalized.includes('invalid_grant')
  );
}

export function isSupabaseAuthMisconfiguration(error: unknown): boolean {
  const normalized = collectErrorText(error).toLowerCase();

  return (
    normalized.includes('invalid api key') ||
    normalized.includes('invalid authentication credentials') ||
    normalized.includes('missing api key') ||
    normalized.includes('missing apikey')
  );
}

export function toUserFacingAuthError(error: unknown, traceId: string): string {
  if (isInvalidLoginCredentials(error)) {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  if (isSupabaseAuthMisconfiguration(error)) {
    return `${AUTH_MISCONFIGURED_MESSAGE} (Trace: ${traceId})`;
  }

  return collectErrorText(error) || 'An unexpected error occurred. Please try again.';
}
