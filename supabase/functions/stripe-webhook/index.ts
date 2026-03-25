import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";

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

function parseSkills(skillsStr: string | undefined): unknown[] {
  if (!skillsStr) return [];
  try {
    return JSON.parse(skillsStr);
  } catch (e) {
    console.error('Failed to parse skills from metadata', e);
    return [];
  }
}

async function getSubscriptionPeriod(subscriptionId: string | null): Promise<{ start: Date | null; end: Date | null }> {
  if (!subscriptionId) return { start: null, end: null };
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      start: new Date(subscription.current_period_start * 1000),
      end: new Date(subscription.current_period_end * 1000),
    };
  } catch (e) {
    console.error('Failed to retrieve subscription to get period dates', e);
    return { start: null, end: null };
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<Response | null> {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier;
  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;

  if (!userId || !tier) {
    console.error('Missing userId or tier in session metadata');
    return new Response('Missing metadata', { status: 400 });
  }

  const skills = parseSkills(session.metadata?.skills);
  const period = await getSubscriptionPeriod(stripeSubscriptionId);

  const { data, error } = await supabaseAdmin.rpc('activate_client_subscription', {
    p_user_id: userId,
    p_tier: tier,
    p_skills: skills,
    p_stripe_customer_id: stripeCustomerId,
    p_stripe_subscription_id: stripeSubscriptionId,
    p_current_period_start: period.start ? period.start.toISOString() : null,
    p_current_period_end: period.end ? period.end.toISOString() : null
  });

  if (error) {
    console.error('Failed to update entitlement via RPC', error);
    return new Response('Failed to provision user', { status: 500 });
  }

  console.log('Successfully provisioned PRO user', userId, data);
  return null;
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing Stripe signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret ?? '');
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return new Response('Webhook signature verification failed.', { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const errorResponse = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      if (errorResponse) return errorResponse;
    }

    // Additional handlers for customer.subscription.updated/deleted could go here
    // to manage the lifecycle in the future.

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Error processing webhook', err);
    return new Response('Internal Server Error', { status: 500 });
  }
});
