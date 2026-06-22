/**
 * Shared HTTP helpers + request types for the generate-business-skills function.
 * Kept in one module so index.ts and onboarding-wizard.ts reuse a single
 * definition (no duplication) and index.ts stays within the module-size policy.
 */

export interface RequestBody {
  intent?: string;
  trigger?: string;
  constraints?: string;
  // Legacy support for OnboardingWizard
  description?: string;
  goal?: string;
}

export type CorsHeaders = Record<string, string>;

export function json(
  data: unknown,
  status: number,
  corsHeaders: CorsHeaders
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
