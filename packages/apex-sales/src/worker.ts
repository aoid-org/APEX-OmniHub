type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APEX_ADMIN_TOKEN: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
};

type JsonRecord = Record<string, unknown>;

type LeadInput = {
  name: string;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  offer_interest?: string | null;
  source?: string | null;
  status?: string;
  notes?: string | null;
  next_action?: string | null;
  next_action_due?: string | null;
  last_contact_at?: string | null;
};

const OFFER_INTERESTS = new Set(['A-SBBL', 'B-Sprint', 'C-OmniHub', 'D-Armageddon', 'E-FLOWBills', 'TDA', 'Other']);
const STATUSES = new Set(['new', 'contacted', 'replied', 'call-booked', 'proposal-sent', 'closed-won', 'closed-lost', 'nurture']);
const EVENT_TYPES = new Set(['email-sent', 'email-replied', 'call', 'proposal', 'closed']);
const PATCHABLE_FIELDS = new Set(['status', 'notes', 'next_action', 'next_action_due', 'last_contact_at']);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function errorResponse(status: number, code: string, message: string, details?: unknown): Response {
  return jsonResponse({ error: { code, message, ...(details === undefined ? {} : { details }) } }, status);
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

function authenticate(request: Request, env: Env): Response | null {
  if (!env.APEX_ADMIN_TOKEN) {
    return errorResponse(500, 'server_misconfigured', 'APEX_ADMIN_TOKEN is not configured.');
  }

  const header = request.headers.get('Authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match || !timingSafeEqual(match[1], env.APEX_ADMIN_TOKEN)) {
    return errorResponse(401, 'unauthorized', 'Valid bearer token required.');
  }

  return null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error('expected_string');
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, maxLength);
}

function cleanDate(value: unknown): string | null {
  const cleaned = cleanText(value, 10);
  if (cleaned === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned) || Number.isNaN(Date.parse(`${cleaned}T00:00:00Z`))) {
    throw new Error('invalid_date');
  }
  return cleaned;
}

function cleanTimestamp(value: unknown): string | null {
  const cleaned = cleanText(value, 40);
  if (cleaned === null) return null;
  const parsed = Date.parse(cleaned);
  if (Number.isNaN(parsed)) throw new Error('invalid_timestamp');
  return new Date(parsed).toISOString();
}

function cleanEmail(value: unknown): string | null {
  const email = cleanText(value, 254);
  if (email === null) return null;
  if (email === '[TBD]') return email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('invalid_email');
  return email.toLowerCase();
}

async function readJson(request: Request): Promise<JsonRecord> {
  if (!request.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
    throw new Error('expected_json');
  }
  const payload = await request.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('expected_object');
  }
  return payload as JsonRecord;
}

function validateCreateLead(payload: JsonRecord): LeadInput {
  const name = cleanText(payload.name, 160);
  if (!name) throw new Error('name_required');

  const offerInterest = cleanText(payload.offer_interest, 32);
  if (offerInterest !== null && !OFFER_INTERESTS.has(offerInterest)) throw new Error('invalid_offer_interest');

  const status = cleanText(payload.status, 32) ?? 'new';
  if (!STATUSES.has(status)) throw new Error('invalid_status');

  return {
    name,
    email: cleanEmail(payload.email),
    company: cleanText(payload.company, 160),
    title: cleanText(payload.title, 160),
    offer_interest: offerInterest,
    source: cleanText(payload.source, 80),
    status,
    notes: cleanText(payload.notes, 5000),
    next_action: cleanText(payload.next_action, 500),
    next_action_due: cleanDate(payload.next_action_due),
    last_contact_at: cleanTimestamp(payload.last_contact_at),
  };
}

function validatePatchLead(payload: JsonRecord): JsonRecord {
  const sanitized: JsonRecord = {};
  for (const key of Object.keys(payload)) {
    if (!PATCHABLE_FIELDS.has(key)) throw new Error(`field_not_patchable:${key}`);
  }

  if ('status' in payload) {
    const status = cleanText(payload.status, 32);
    if (!status || !STATUSES.has(status)) throw new Error('invalid_status');
    sanitized.status = status;
    if (['contacted', 'replied', 'call-booked', 'proposal-sent', 'closed-won', 'closed-lost'].includes(status)) {
      sanitized.last_contact_at = new Date().toISOString();
    }
  }
  if ('notes' in payload) sanitized.notes = cleanText(payload.notes, 5000);
  if ('next_action' in payload) sanitized.next_action = cleanText(payload.next_action, 500);
  if ('next_action_due' in payload) sanitized.next_action_due = cleanDate(payload.next_action_due);
  if ('last_contact_at' in payload) sanitized.last_contact_at = cleanTimestamp(payload.last_contact_at);

  if (Object.keys(sanitized).length === 0) throw new Error('empty_patch');
  return sanitized;
}

function validateEvent(payload: JsonRecord): JsonRecord {
  const eventType = cleanText(payload.event_type, 40);
  if (!eventType || !EVENT_TYPES.has(eventType)) throw new Error('invalid_event_type');
  return {
    event_type: eventType,
    notes: cleanText(payload.notes, 5000),
  };
}

function idFromPath(pathname: string, suffix = ''): string | null {
  const pattern = suffix ? new RegExp(`^/leads/([^/]+)${suffix}$`) : /^\/leads\/([^/]+)$/;
  const match = pathname.match(pattern);
  if (!match) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(match[1]) ? match[1] : null;
}

async function supabase(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse(500, 'server_misconfigured', 'Supabase environment variables are not configured.');
  }

  const baseUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const headers = new Headers(init.headers);
  headers.set('apikey', env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set('Authorization', `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
  headers.set('Content-Type', 'application/json');

  return fetch(`${baseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function parseSupabase(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) {
    let details: unknown = text;
    try {
      details = JSON.parse(text);
    } catch {
      // Keep upstream text only when it is not JSON; stack traces are never emitted by this worker.
    }
    throw new Error(JSON.stringify({ status: response.status, details }));
  }
  return text ? JSON.parse(text) : null;
}

async function listLeads(env: Env, url: URL): Promise<Response> {
  const status = cleanText(url.searchParams.get('status'), 32);
  if (status !== null && !STATUSES.has(status)) return errorResponse(400, 'invalid_status', 'Unsupported status filter.');

  const filter = status ? `&status=eq.${encodeURIComponent(status)}` : '';
  const response = await supabase(env, `leads?select=*&order=created_at.desc${filter}`, { method: 'GET' });
  return jsonResponse({ data: await parseSupabase(response) });
}

async function createLead(env: Env, request: Request): Promise<Response> {
  const lead = validateCreateLead(await readJson(request));
  const response = await supabase(env, 'leads?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(lead),
  });
  const data = (await parseSupabase(response)) as unknown[];
  return jsonResponse({ data: data[0] }, 201);
}

async function getLead(env: Env, leadId: string): Promise<Response> {
  const [leadResponse, eventsResponse] = await Promise.all([
    supabase(env, `leads?id=eq.${leadId}&select=*`, { method: 'GET' }),
    supabase(env, `lead_events?lead_id=eq.${leadId}&select=*&order=created_at.desc`, { method: 'GET' }),
  ]);
  const leads = (await parseSupabase(leadResponse)) as unknown[];
  if (!leads[0]) return errorResponse(404, 'not_found', 'Lead not found.');
  const events = await parseSupabase(eventsResponse);
  return jsonResponse({ data: { ...(leads[0] as JsonRecord), events } });
}

async function patchLead(env: Env, request: Request, leadId: string): Promise<Response> {
  const patch = validatePatchLead(await readJson(request));
  const response = await supabase(env, `leads?id=eq.${leadId}&select=*`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  const data = (await parseSupabase(response)) as unknown[];
  if (!data[0]) return errorResponse(404, 'not_found', 'Lead not found.');
  return jsonResponse({ data: data[0] });
}

async function addLeadEvent(env: Env, request: Request, leadId: string): Promise<Response> {
  const event = validateEvent(await readJson(request));
  const response = await supabase(env, 'lead_events?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...event, lead_id: leadId }),
  });
  const data = (await parseSupabase(response)) as unknown[];
  return jsonResponse({ data: data[0] }, 201);
}

function emptyMatrix(): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const offer of OFFER_INTERESTS) {
    matrix[offer] = {};
    for (const status of STATUSES) matrix[offer][status] = 0;
  }
  return matrix;
}

async function pipelineSummary(env: Env): Promise<Response> {
  const [leadsResponse, eventsResponse] = await Promise.all([
    supabase(env, 'leads?select=offer_interest,status,last_contact_at', { method: 'GET' }),
    supabase(env, 'lead_events?select=event_type,created_at', { method: 'GET' }),
  ]);
  const leads = (await parseSupabase(leadsResponse)) as Array<{ offer_interest: string | null; status: string }>;
  const events = (await parseSupabase(eventsResponse)) as Array<{ event_type: string | null; created_at: string }>;

  const byStatus: Record<string, number> = {};
  const byOfferInterest: Record<string, number> = {};
  const matrix = emptyMatrix();
  for (const lead of leads) {
    const offer = lead.offer_interest ?? 'Other';
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
    byOfferInterest[offer] = (byOfferInterest[offer] ?? 0) + 1;
    if (!matrix[offer]) matrix[offer] = {};
    matrix[offer][lead.status] = (matrix[offer][lead.status] ?? 0) + 1;
  }

  const now = new Date();
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay()));
  const contactedThisWeek = events.filter((event) => ['email-sent', 'call', 'proposal'].includes(event.event_type ?? '') && new Date(event.created_at) >= weekStart).length;
  const totalReplied = leads.filter((lead) => ['replied', 'call-booked', 'proposal-sent', 'closed-won', 'closed-lost'].includes(lead.status)).length;
  const contactedTotal = leads.filter((lead) => lead.status !== 'new').length;
  const conversionRate = contactedTotal === 0 ? 0 : Number(((leads.filter((lead) => lead.status === 'closed-won').length / contactedTotal) * 100).toFixed(2));

  return jsonResponse({ data: { by_status: byStatus, by_offer_interest: byOfferInterest, matrix, contacted_this_week: contactedThisWeek, total_replied: totalReplied, conversion_rate: conversionRate } });
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const authError = authenticate(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const leadId = idFromPath(url.pathname);
  const eventLeadId = idFromPath(url.pathname, '\\/events');

  try {
    if (request.method === 'GET' && url.pathname === '/leads') return listLeads(env, url);
    if (request.method === 'POST' && url.pathname === '/leads') return createLead(env, request);
    if (request.method === 'GET' && leadId) return getLead(env, leadId);
    if (request.method === 'PATCH' && leadId) return patchLead(env, request, leadId);
    if (request.method === 'POST' && eventLeadId) return addLeadEvent(env, request, eventLeadId);
    if (request.method === 'GET' && url.pathname === '/pipeline') return pipelineSummary(env);
    return errorResponse(404, 'not_found', 'Endpoint not found.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    if (message.includes('expected_json')) return errorResponse(415, 'expected_json', 'Request body must be JSON.');
    if (message.includes('expected_object')) return errorResponse(400, 'expected_object', 'JSON body must be an object.');
    if (message.includes('name_required')) return errorResponse(400, 'name_required', 'Lead name is required.');
    if (message.includes('invalid_email')) return errorResponse(400, 'invalid_email', 'Email address is invalid.');
    if (message.includes('invalid_offer_interest')) return errorResponse(400, 'invalid_offer_interest', 'Offer interest is invalid.');
    if (message.includes('invalid_status')) return errorResponse(400, 'invalid_status', 'Status is invalid.');
    if (message.includes('invalid_date')) return errorResponse(400, 'invalid_date', 'Date must use YYYY-MM-DD.');
    if (message.includes('invalid_timestamp')) return errorResponse(400, 'invalid_timestamp', 'Timestamp is invalid.');
    if (message.includes('invalid_event_type')) return errorResponse(400, 'invalid_event_type', 'Event type is invalid.');
    if (message.includes('field_not_patchable')) return errorResponse(400, 'field_not_patchable', 'Only status, notes, next_action, next_action_due, and last_contact_at can be patched.');
    if (message.includes('empty_patch')) return errorResponse(400, 'empty_patch', 'Patch body must include at least one supported field.');
    return errorResponse(502, 'upstream_error', 'Supabase request failed.');
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    const url = new URL(request.url);
    if (url.pathname === '/leads' || url.pathname.startsWith('/leads/') || url.pathname === '/pipeline') {
      return handleApi(request, env);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return errorResponse(404, 'not_found', 'Static asset not found.');
  },
};
