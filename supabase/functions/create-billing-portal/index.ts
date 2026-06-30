import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";
import { handlePreflight } from "../_shared/cors.ts";
import { okResponse, errResponse } from "../_shared/response.ts";

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ALLOWED_RETURN_ORIGINS = new Set([
  'https://apexomnihub.icu',
  'https://www.apexomnihub.icu',
  'https://app.apexomnihub.icu',
]);

function resolveReturnUrl(origin: string | null, requested: unknown): string {
  const candidate = typeof requested === 'string' ? requested : origin;
  try {
    const url = new URL(candidate || 'https://apexomnihub.icu/omnidash');
    const allowedOrigin = ALLOWED_RETURN_ORIGINS.has(url.origin) ? url.origin : 'https://apexomnihub.icu';
    return `${allowedOrigin}/omnidash`;
  } catch {
    return 'https://apexomnihub.icu/omnidash';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handlePreflight(req);

  const origin = req.headers.get('origin');
  if (req.method !== 'POST') {
    return errResponse('METHOD_NOT_ALLOWED', 'Only POST is allowed', 405, origin);
  }
  if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return errResponse('BILLING_PORTAL_NOT_CONFIGURED', 'Billing portal is not configured. Contact support.', 503, origin);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errResponse('UNAUTHORIZED', 'Missing authorization header', 401, origin);
  }

  // Pass the JWT explicitly to getUser(token). On supabase-js 2.39.x a no-arg
  // getUser() does NOT validate the global Authorization header (it reads the
  // non-existent stored session and fails), so a valid user token was rejected
  // as "Invalid authentication token". Passing the bearer token validates that
  // exact JWT regardless of session/SDK version.
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) {
    return errResponse('UNAUTHORIZED', 'Invalid authentication token', 401, origin);
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const returnUrl = resolveReturnUrl(origin, body.returnUrl);

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: subscription, error: subscriptionError } = await serviceClient
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error('Billing portal subscription lookup failed:', subscriptionError.message);
    return errResponse('BILLING_PORTAL_UNAVAILABLE', 'Billing portal is unavailable. Try again later.', 503, origin);
  }

  const customerId = subscription?.stripe_customer_id;
  if (!customerId) {
    return errResponse('BILLING_CUSTOMER_NOT_FOUND', 'No Stripe customer is linked to this account yet.', 404, origin);
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    if (!session.url) {
      return errResponse('BILLING_PORTAL_UNAVAILABLE', 'Stripe did not return a billing portal URL.', 503, origin);
    }
    return okResponse({ url: session.url }, origin, 200);
  } catch (error) {
    console.error('Billing portal session creation failed:', error instanceof Error ? error.message : error);
    return errResponse('BILLING_PORTAL_UNAVAILABLE', 'Billing portal is unavailable. Try again later.', 503, origin);
  }
});
