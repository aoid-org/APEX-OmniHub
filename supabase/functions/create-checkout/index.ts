import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";
import { handlePreflight } from "../_shared/cors.ts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";
import { okResponse, errResponse } from "../_shared/response.ts";

const stripeSecretKey    = Deno.env.get('STRIPE_SECRET_KEY');
const stripePriceIdPro   = Deno.env.get('STRIPE_PRICE_ID_PRO');  // $99 CAD/mo
const stripePriceIdBus   = Deno.env.get('STRIPE_PRICE_ID_BUS');  // $299 CAD/mo — includes PhysiOmni

interface RequestBody {
  tier: 'PRO' | 'BUS';
  skills: Record<string, unknown>[];
  returnUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  const origin = req.headers.get("origin");

  // Fail-closed: require the Stripe secret key. Individual price IDs are
  // validated per-request based on the requested tier below.
  if (!stripeSecretKey) {
    return errResponse('BILLING_NOT_CONFIGURED', 'Billing is not configured. Contact support at billing@apexbusiness.systems.', 503, origin);
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errResponse('UNAUTHORIZED', 'Missing authorization header', 401, origin);
    }

    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Pass the JWT explicitly: a no-arg getUser() on supabase-js 2.39.x does not
    // validate the global Authorization header, rejecting valid user tokens.
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await client.auth.getUser(token);

    if (authError || !user) {
      return errResponse('UNAUTHORIZED', 'Invalid authentication token', 401, origin);
    }

    const rl = await checkRateLimit(user.id, RATE_LIMIT_CONFIGS.createCheckout);
    if (!rl.allowed) {
      return rateLimitExceededResponse(origin, rl);
    }

    const body = await req.json() as RequestBody;

    if (body.tier !== 'PRO' && body.tier !== 'BUS') {
      return errResponse('INVALID_TIER', 'tier must be PRO or BUS', 400, origin);
    }

    // Select price ID for the requested tier. Fail-closed if not configured.
    const stripePriceId = body.tier === 'BUS' ? stripePriceIdBus : stripePriceIdPro;
    if (!stripePriceId) {
      return errResponse('BILLING_NOT_CONFIGURED', `Price ID for tier ${body.tier} is not configured. Contact support at billing@apexbusiness.systems.`, 503, origin);
    }

    // Determine the base URL for success/cancel redirects.
    // Only allow known-good origins to prevent open-redirect abuse.
    const ALLOWED_ORIGINS = [
      'https://apexomnihub.icu',
      'https://www.apexomnihub.icu',
      'https://app.apexomnihub.icu',
    ];
    const candidateBase = body.returnUrl || origin || '';
    const isAllowed = ALLOWED_ORIGINS.some((o) => candidateBase === o || candidateBase.startsWith(o + '/'));
    const baseUrl = isAllowed ? candidateBase : 'https://apexomnihub.icu';

    // Verify if we have a customer already
    const { data: subscription } = await client
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/omnidash?onboarded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/launch?step=2`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        tier: body.tier,
        skills: JSON.stringify(body.skills),
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        }
      }
    });

    return okResponse({ url: session.url }, origin, 200);

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return errResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred. Please try again.', 500, origin);
  }
});
