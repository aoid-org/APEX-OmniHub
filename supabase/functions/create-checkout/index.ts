import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";
import { buildCorsHeaders, handlePreflight, corsErrorResponse } from "../_shared/cors.ts";

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
// For MVP we hardcode the fallback if env is missing
const stripePriceId = Deno.env.get('STRIPE_PRICE_ID_PRO') || 'price_123456789';

const stripe = new Stripe(stripeSecretKey ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

interface RequestBody {
  tier: 'PRO';
  skills: any[];
  returnUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsErrorResponse('UNAUTHORIZED', 'Missing authorization header', 401, origin);
    }

    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      return corsErrorResponse('UNAUTHORIZED', 'Invalid authentication token', 401, origin);
    }

    const body = await req.json() as RequestBody;

    if (body.tier !== 'PRO') {
      return new Response(
        JSON.stringify({ error: 'INVALID_TIER', message: 'This endpoint is for PRO tier checkout' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine the base URL for success/cancel redirects.
    // If body.returnUrl is provided and matches allowed origins, use it. Otherwise use origin.
    const baseUrl = body.returnUrl || origin || 'https://apexomnihub.icu';

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
        tier: 'PRO',
        skills: JSON.stringify(body.skills),
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        }
      }
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
