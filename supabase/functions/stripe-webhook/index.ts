import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const stripe = new Stripe(stripeSecretKey ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Create a service role client to execute the RPC
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

type SubscriptionPeriod = {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
};

function parseSkills(skillsStr: string | undefined): unknown[] {
  if (!skillsStr) {
    return [];
  }

  try {
    return JSON.parse(skillsStr);
  } catch (error) {
    console.error('Failed to parse skills from metadata', error);
    return [];
  }
}

async function getSubscriptionPeriod(stripeSubscriptionId: string): Promise<SubscriptionPeriod> {
  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    return {
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
  } catch (error) {
    console.error('Failed to retrieve subscription to get period dates', error);
    return {
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };
  }
}

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<Response | null> {
  const session = event.data.object as Stripe.Checkout.Session;

  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier;
  const skills = parseSkills(session.metadata?.skills);
  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;

  if (!userId || !tier) {
    console.error('Missing userId or tier in session metadata');
    return new Response('Missing metadata', { status: 400 });
  }

  const { currentPeriodStart, currentPeriodEnd } = stripeSubscriptionId
    ? await getSubscriptionPeriod(stripeSubscriptionId)
    : { currentPeriodStart: null, currentPeriodEnd: null };

  const { data, error } = await supabaseAdmin.rpc('activate_client_subscription', {
    p_user_id: userId,
    p_tier: tier,
    p_skills: skills,
    p_stripe_customer_id: stripeCustomerId,
    p_stripe_subscription_id: stripeSubscriptionId,
    p_current_period_start: currentPeriodStart ? currentPeriodStart.toISOString() : null,
    p_current_period_end: currentPeriodEnd ? currentPeriodEnd.toISOString() : null
  });

  if (error) {
    console.error('Failed to update entitlement via RPC', error);
    return new Response('Failed to provision user', { status: 500 });
  }

  console.log('Successfully provisioned PRO user', userId, data);
  return null;
}

async function processStripeEvent(event: Stripe.Event): Promise<Response> {
  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const errorResponse = await handleCheckoutSessionCompleted(event);
  if (errorResponse) {
    return errorResponse;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing Stripe signature', { status: 400 });
  }

  // Distributed rate limiting — keyed by Stripe signature (no authenticated user)
  const rl = await checkRateLimit(signature ?? 'anonymous', RATE_LIMIT_CONFIGS.stripeWebhook);
  if (!rl.allowed) {
    return rateLimitExceededResponse(null, rl);
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    // Verify signature
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret ?? '');
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return new Response('Webhook signature verification failed.', { status: 400 });
  }

  try {
    return await processStripeEvent(event);
  } catch (error) {
    console.error('Error processing webhook', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});
