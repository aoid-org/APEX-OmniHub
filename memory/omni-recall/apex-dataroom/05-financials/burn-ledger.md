---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Burn Ledger

> Auto-scanned May 8, 2026. Scope: local `APEX-OmniHub` workspace plus public GitHub clones for `apexbusiness-systems/sbbl-hq`, `apexbusiness-systems/armageddon-core`, `apexbusiness-systems/FLOWBills`, `apexbusiness-systems/aSpiral`, `apexbusiness-systems/RobuxMinerPro`, `apexbusiness-systems/TradeLine247`, `apexbusiness-systems/autorep-ai-console`, `apexbusiness-systems/jubeeloveai`, and `Apex-Business-Apps/lampstand`.
>
> Costs are intentionally not estimated. JR must fill every Monthly Cost cell.

| Service | Repo/Product | Plan/Tier | Monthly Cost | Keep/Kill/Verify | Evidence | Action Due |
|---|---|---|---|---|---|---|
| Supabase | APEX-OmniHub | Project `rtopreovkywofgwgmozi`; Edge Functions | [JR TO FILL] | KEEP | `supabase/config.toml` project_id; `@supabase/supabase-js`; `.env.example` Supabase vars | Verify billing owner and monthly usage in Supabase dashboard |
| Supabase | FLOWBills | Project `ullqluvzkgnwwqijhvjr`; Edge Functions | [JR TO FILL] | KEEP | `supabase/config.toml` project_id; `@supabase/supabase-js`; `.env.example` Supabase vars | Verify billing owner and monthly usage in Supabase dashboard |
| Supabase | RobuxMinerPro | Project `huaxdvjartkzlgjlzwzg`; Edge Functions | [JR TO FILL] | KEEP | `supabase/config.toml` project_id; `@supabase/supabase-js`; `.env.example` Supabase vars | Verify billing owner and monthly usage in Supabase dashboard |
| Supabase | TradeLine247 | Project `hysvqdwmhxnblxfqnszn`; Edge Functions | [JR TO FILL] | ALREADY KILLED | `supabase/config.toml` project_id; mission states TradeLine247 archived May 5 | Confirm Supabase project paused/deleted or retained only for records export |
| Supabase | aSpiral | Project `eqtwatyodujxofrdznen`; Edge Functions | [JR TO FILL] | KEEP | `supabase/config.toml` project_id; `@supabase/supabase-js`; `.env.example` Supabase vars | Verify billing owner and monthly usage in Supabase dashboard |
| Supabase | armageddon-core | Linked Supabase clients; no root project ref found in scanned config | [JR TO FILL] | KEEP | Multiple `package.json` files include `@supabase/supabase-js`; `armageddon-site/.env.example` Supabase vars | Verify actual project ref from deployed environment |
| Supabase | autorep-ai-console | Project `sijqccfsvrvgujgkkwuf`; Edge Functions | [JR TO FILL] | KEEP | `supabase/config.toml` project_id; `@supabase/supabase-js`; `.env.example` Supabase vars | Verify billing owner and monthly usage in Supabase dashboard |
| Supabase | jubeeloveai | Project `kphdqgidwipqdthehckg`; Edge Functions | [JR TO FILL] | KEEP | `supabase/config.toml` project_id; `@supabase/supabase-js`; `.env.example` Supabase vars | Verify billing owner and monthly usage in Supabase dashboard |
| Supabase | lampstand | Project `jfqivpqedhmgyqwqpwim`; Edge Functions | [JR TO FILL] | KEEP | `supabase/config.toml` project_id; `@supabase/supabase-js`; `.env.example` Supabase vars | Verify billing owner and monthly usage in Supabase dashboard |
| Supabase | sbbl-hq | Local config project `app`; deployed URL `ezanilxygnpucwkwpsoc.supabase.co` in worker config | [JR TO FILL] | KEEP | `supabase/config.toml`; `wrangler.jsonc` Supabase vars; `@supabase/supabase-js` | Verify production Supabase project ref and billing owner |
| Stripe | APEX-OmniHub | Stripe API via Supabase Edge Functions | [JR TO FILL] | KEEP | `supabase/functions/stripe-webhook/index.ts`; `supabase/functions/create-checkout/index.ts` import Stripe | Verify active products, webhook endpoints, and processing volume |
| Stripe | FLOWBills | Stripe API via Supabase Edge Functions | [JR TO FILL] | KEEP | `supabase/config.toml` defines `stripe-webhook`; functions import Stripe `14.21.0` | Verify active products, webhook endpoints, and processing volume |
| Stripe | TradeLine247 | Stripe webhook/payment records | [JR TO FILL] | ALREADY KILLED | `supabase/functions/stripe-webhook/index.ts`; mission states TradeLine247 archived May 5 | Confirm webhook disabled and no active subscriptions remain |
| Stripe | sbbl-hq | Stripe secrets bound to Cloudflare Worker | [JR TO FILL] | KEEP | `wrangler.jsonc` documents `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; deploy workflow syncs Stripe secret | Verify live/test mode and active billing products |
| Cloudflare Pages/Workers | APEX-OmniHub | Cloudflare/Terraform deployment and Workers secrets | [JR TO FILL] | KEEP | `.env.example` references Cloudflare Workers secrets; workflows use Cloudflare API token | Verify account plan, Pages projects, Workers, and Terraform-managed resources |
| Cloudflare Pages/Workers | FLOWBills | Cloudflare Pages project `flowbills` | [JR TO FILL] | KEEP | `.env.example` says production builds use Cloudflare Pages; workflow sets `CLOUDFLARE_PROJECT_NAME: flowbills` | Verify Pages project and custom domains |
| Cloudflare Workers KV | RobuxMinerPro | Worker `robuxminerpro-agent-gateway`; KV `RATE_LIMIT`, `RESPONSE_CACHE` | [JR TO FILL] | KEEP | `cloudflare/worker/wrangler.toml` defines Worker name and KV namespace bindings | Replace placeholder KV ids if active; verify Workers/KV usage |
| Cloudflare Pages | TradeLine247 | Pages project `tradeline247` | [JR TO FILL] | ALREADY KILLED | `wrangler.toml` names `tradeline247`; mission states TradeLine247 archived May 5 | Confirm Pages project disabled/deleted or parked |
| Cloudflare Pages | aSpiral | Pages project `aspiral` | [JR TO FILL] | KEEP | `wrangler.toml` names `aspiral` with `pages_build_output_dir = "dist"` | Verify Pages project and custom domains |
| Cloudflare Workers | armageddon-core | Worker `armageddon-core` | [JR TO FILL] | KEEP | `armageddon-site/wrangler.jsonc` names `armageddon-core`; deploy workflow says Cloudflare Workers | Verify Workers routes and account plan |
| Cloudflare Workers | lampstand | Worker `lampstand` | [JR TO FILL] | KEEP | `wrangler.jsonc` names `lampstand`; package includes `wrangler` | Verify Workers routes and account plan |
| Cloudflare Workers/KV | sbbl-hq | Worker `sbbl-hq-worker`; API proxy `sbbl-api-proxy`; KV `SBBL_BACKEND_STATE` | [JR TO FILL] | KEEP | `wrangler.jsonc` names production Worker; `src/api-proxy-worker/wrangler.toml` defines route and KV binding | Verify Workers, KV namespace id, custom domains, and secrets |
| OpenAI | APEX-OmniHub | `@ai-sdk/openai`; OpenAI env vars; BYOM proxy | [JR TO FILL] | KEEP | `package.json` includes `@ai-sdk/openai`; `orchestrator/.env.example` has `OPENAI_API_KEY`; Supabase functions reference OpenAI | Verify key owner, usage limits, and model spend |
| OpenAI | FLOWBills | LLM provider `openai`; realtime/chat/assistant functions | [JR TO FILL] | KEEP | `.env.example` sets `LLM_PROVIDER=openai`; functions use `OPENAI_API_KEY` and OpenAI realtime endpoint | Verify model usage and API spend |
| OpenAI | TradeLine247 | `openai` npm package; Supabase AI functions | [JR TO FILL] | ALREADY KILLED | `package.json` includes `openai`; functions use `OPENAI_API_KEY`; mission states TradeLine247 archived May 5 | Revoke/disable keys tied only to TradeLine247 |
| OpenAI | aSpiral | OpenAI realtime/chat fallback | [JR TO FILL] | KEEP | `.env.example` references `OPENAI_REALTIME_MODEL`; functions use `OPENAI_API_KEY` | Verify realtime model usage and spend |
| OpenAI | jubeeloveai | OpenAI fallback for text-to-speech; Groq OpenAI-compatible endpoints | [JR TO FILL] | KEEP | Functions reference OpenAI-compatible endpoints and OpenAI fallback | Verify whether paid OpenAI key is configured or only compatibility endpoint is used |
| Anthropic | APEX-OmniHub | `@ai-sdk/anthropic`; BYOM proxy | [JR TO FILL] | KEEP | `package.json` includes `@ai-sdk/anthropic`; `orchestrator/.env.example` has `ANTHROPIC_API_KEY`; functions reference Anthropic | Verify key owner, usage limits, and model spend |
| Groq | APEX-OmniHub | BYOM provider | [JR TO FILL] | KEEP | Supabase BYOM provider list includes `groq` | Verify whether production Groq API key is configured |
| Groq | RobuxMinerPro | Supabase functions route fast LLM calls to Groq | [JR TO FILL] | KEEP | Functions import/call `callGroq`; shared constants define `GROQ_TIMEOUT_MS` | Verify Groq key owner and usage |
| Groq | aSpiral | TTS primary or fallback path | [JR TO FILL] | KEEP | `text-to-speech` function comments identify Groq TTS primary with OpenAI fallback | Verify Groq key owner and usage |
| Groq | autorep-ai-console | Primary LLM provider | [JR TO FILL] | KEEP | `.env.example` documents `GROQ_API_KEY` as primary LLM provider; `agent-orchestrator` uses Groq base URL | Verify Groq key owner and usage |
| Groq | jubeeloveai | Conversation and speech-to-text | [JR TO FILL] | KEEP | Functions use `GROQ_API_KEY` and Groq Whisper/speech-to-text paths | Verify Groq key owner and usage |
| Groq | lampstand | Client-visible Groq API env | [JR TO FILL] | KEEP | `.env.example` includes `VITE_GROQ_API_KEY` | Move server-side if active; verify key owner and usage |
| Groq | sbbl-hq | Vision/POTG parsing | [JR TO FILL] | KEEP | `wrangler.jsonc` documents `GROQ_API_KEY`; deploy workflow syncs Groq secret | Verify Groq key owner and usage |
| Gemini / Google AI | APEX-OmniHub | BYOM Google/Gemini provider | [JR TO FILL] | KEEP | Functions reference Google Gemini adapter/provider | Verify Google AI key owner and usage |
| Gemini / Google AI | FLOWBills | Gemini 2.5 Flash extraction/suggestions | [JR TO FILL] | KEEP | Supabase functions reference `google/gemini-2.5-flash` | Verify Google AI key owner and usage |
| Gemini / Google AI | RobuxMinerPro | Gemini functions and embeddings | [JR TO FILL] | KEEP | Functions reference `GEMINI_API_KEY` and `google/gemini-2.5-flash` | Verify Google AI key owner and usage |
| Gemini / Google AI | TradeLine247 | Gemini chat model | [JR TO FILL] | ALREADY KILLED | `supabase/functions/chat/index.ts` references `google/gemini-2.5-flash`; mission states TradeLine247 archived May 5 | Revoke/disable keys tied only to TradeLine247 |
| Gemini / Google AI | aSpiral | Gemini 2.5 Flash functions | [JR TO FILL] | KEEP | Supabase functions reference `google/gemini-2.5-flash` | Verify Google AI key owner and usage |
| ElevenLabs | FLOWBills | `@elevenlabs/react` package | [JR TO FILL] | VERIFY | `package.json` includes `@elevenlabs/react` | Verify whether account/API key is active and whether to keep |
| ElevenLabs | jubeeloveai | Sound generation and TTS | [JR TO FILL] | VERIFY | Functions use `ELEVENLABS_API_KEY`, sound-generation endpoint, and TTS fallback logic | Verify voice plan, usage, and retention need |
| ElevenLabs | lampstand | TTS Edge Function | [JR TO FILL] | VERIFY | `supabase/functions/elevenlabs-tts/index.ts` reads `ELEVENLABS_API_KEY` | Verify voice plan, usage, and retention need |
| Twilio | TradeLine247 | Voice/SMS webhooks | [JR TO FILL] | ALREADY KILLED | `.env.example` has Twilio SID/token vars; package includes `twilio`; mission states TradeLine247 archived May 5 | Confirm phone numbers released and webhooks disabled |
| Twilio | aSpiral | Voice stream auth | [JR TO FILL] | VERIFY | `.env.example` has `TWILIO_AUTH_TOKEN`; `voice-stream` reads Twilio auth token | Verify number ownership, webhook activity, and plan |
| Twilio | autorep-ai-console | SMS/inbound webhook support | [JR TO FILL] | VERIFY | `.env.example` documents Twilio vars; functions validate Twilio signatures and send SMS | Verify number ownership, webhook activity, and plan |
| Twilio | sbbl-hq | Supabase auth SMS provider option | [JR TO FILL] | VERIFY | `supabase/config.toml` documents Twilio as supported SMS provider | Verify whether SMS auth provider is enabled in production |
| Resend | APEX-OmniHub | Automation email function | [JR TO FILL] | KEEP | `execute-automation` Supabase function references Resend API | Verify sending domain and account owner |
| Resend | FLOWBills | Budget alert email path | [JR TO FILL] | KEEP | Supabase function references Resend client/API key | Verify sending domain and account owner |
| Resend | TradeLine247 | Transactional email | [JR TO FILL] | ALREADY KILLED | `.env.example` has `RESEND_API_KEY`; invite/transcript/contact functions import Resend; mission states archived May 5 | Disable key/domain if only used by TradeLine247 |
| Resend | autorep-ai-console | Email function | [JR TO FILL] | KEEP | `.env.example` documents `RESEND_API_KEY`; `send-email` reads it | Verify sending domain and account owner |
| Resend | jubeeloveai | Screen-time alert email | [JR TO FILL] | KEEP | `send-screen-time-alert` imports Resend | Verify sending domain and account owner |
| Resend | sbbl-hq | Worker email secret | [JR TO FILL] | KEEP | `wrangler.jsonc` documents `RESEND_API_KEY`; deploy workflow syncs Resend secret | Verify sending domain and account owner |
| Sentry | APEX-OmniHub | Optional frontend and workflow DSN | [JR TO FILL] | VERIFY | `.env.example` documents `VITE_SENTRY_DSN`; workflows reference Sentry DSN | Verify whether project is active and billed |
| Sentry | TradeLine247 | Frontend monitoring | [JR TO FILL] | ALREADY KILLED | `.env.example` has `VITE_SENTRY_DSN`; package includes `@sentry/react`; mission states archived May 5 | Remove/revoke project if not used elsewhere |
| Sentry | jubeeloveai | Optional frontend monitoring | [JR TO FILL] | VERIFY | `package.json` includes `@sentry/react`; `.env.example` documents optional Sentry DSN | Verify whether project is active and billed |
| Sentry | sbbl-hq | Cloudflare/browser monitoring | [JR TO FILL] | VERIFY | `package.json` includes `@sentry/cloudflare` and `@sentry/react`; env and wrangler configs document Sentry DSNs | Verify Sentry org/project billing |
| Datadog | APEX-OmniHub | Terraform/workflow RUM variables | [JR TO FILL] | VERIFY | `.github/workflows/cd-staging.yml` references `DATADOG_APP_ID` and `DATADOG_CLIENT_TOKEN` | Verify whether Datadog account is active |
| Upstash Redis | APEX-OmniHub | Redis/rate-limit support | [JR TO FILL] | VERIFY | `orchestrator/.env.example` has Upstash Redis vars; package-lock includes `@upstash/redis`; rate-limit function comments cite Upstash | Verify whether Redis database exists and is billed |
| PlanetScale | APEX-OmniHub | Package-lock dependency only | [JR TO FILL] | VERIFY | `package-lock.json` includes `@planetscale/database`; no direct `.env.example` PlanetScale vars found | Verify whether this is transitive/stale or an active paid database |
| Railway | TradeLine247 | Runtime voice bridge URL | [JR TO FILL] | VERIFY | `supabase/functions/voice-frontdoor/index.ts` points at `tradeline247-railway-production.up.railway.app` | Confirm Railway project shutdown for archived TradeLine247 runtime |
| Codemagic | aSpiral | Mobile build provider mentioned in CI comments | [JR TO FILL] | VERIFY | `.github/workflows/ci.yml` says mobile builds via Codemagic | Verify Codemagic account, app, and billing status |
| Vercel | APEX-OmniHub / OmniHub Site | Legacy env references; no `vercel.json` found in local workspace | [JR TO FILL] | ALREADY KILLED | `.env.example` and `apps/omnihub-site/.env.example` mention Vercel env setup only | Confirm no active production deploys remain in Vercel dashboard |
| Vercel | FLOWBills | Deploys disabled in `vercel.json` | [JR TO FILL] | ALREADY KILLED | `vercel.json` has `deploymentEnabled: false` and GitHub integration disabled | Confirm Vercel project removed/disabled in dashboard |
| Vercel | TradeLine247 | Legacy status override only | [JR TO FILL] | ALREADY KILLED | Workflow marks Vercel status successful because Cloudflare is authoritative; mission states archived May 5 | Confirm no active Vercel production deploy remains |
| Vercel | aSpiral | `vercel.json` still present | [JR TO FILL] | VERIFY | `vercel.json` defines Vite build/install/output settings | Verify if any production deploy is active; KILL if active |
| Vercel | armageddon-core | Explicit zero-Vercel comment | [JR TO FILL] | ALREADY KILLED | Cloudflare deploy workflow says site serves directly from Cloudflare — zero Vercel | Confirm no active Vercel project remains |
| Runtime/Product | TradeLine247 | Archived product runtime | [JR TO FILL] | ALREADY KILLED | Mission states TradeLine247 archived May 5; repo still has Cloudflare/Supabase/Railway/Twilio config evidence | Finish shutdown checklist for runtime leftovers and retained records |

## Burn Scorecard — Auto-Generated May 8 2026
| Category | Services Found | Status |
|---|---|---|
| Cloudflare | APEX-OmniHub Workers/secrets; FLOWBills Pages; RobuxMinerPro Worker + KV; TradeLine247 Pages; aSpiral Pages; armageddon-core Worker; lampstand Worker; sbbl-hq Workers + KV | KEEP |
| Supabase | APEX-OmniHub `rtopreovkywofgwgmozi`; FLOWBills `ullqluvzkgnwwqijhvjr`; RobuxMinerPro `huaxdvjartkzlgjlzwzg`; TradeLine247 `hysvqdwmhxnblxfqnszn`; aSpiral `eqtwatyodujxofrdznen`; armageddon-core clients; autorep-ai-console `sijqccfsvrvgujgkkwuf`; jubeeloveai `kphdqgidwipqdthehckg`; lampstand `jfqivpqedhmgyqwqpwim`; sbbl-hq deployed `ezanilxygnpucwkwpsoc` | KEEP |
| Stripe | APEX-OmniHub; FLOWBills; TradeLine247; sbbl-hq | KEEP |
| AI APIs | OpenAI; Anthropic; Groq; Gemini / Google AI; ElevenLabs | VERIFY cost |
| Vercel | APEX-OmniHub legacy env refs; FLOWBills disabled config; TradeLine247 legacy status override; aSpiral active-looking config; armageddon-core zero-Vercel comment | KILLED or VERIFY |
| Telecom/Voice | Twilio; ElevenLabs; TradeLine247 Railway voice bridge | KILLED or VERIFY |
| CI/CD | Codemagic; Cloudflare deploy workflows; GitHub Actions; Vercel legacy status override | VERIFY |
| Other | Sentry; Datadog; Upstash Redis; PlanetScale package-lock dependency; Resend; Railway | VERIFY |
