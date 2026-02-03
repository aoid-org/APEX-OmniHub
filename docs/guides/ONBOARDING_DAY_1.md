<!-- VALUATION_IMPACT: Guarantees 15-minute onboarding for new contributors -->
<!-- Generated: 2026-02-03 -->
# Onboarding Day 1
## Promise
Localhost ready in under 15 minutes.

## Steps
1. `git clone https://github.com/apex-omnihub/apex-omnihub.git`
2. `cd apex-omnihub && npm install`
3. `npx supabase db seed`
4. `npm run dev`
5. Health check: `curl -f http://localhost:3000/health`

## Troubleshooting
| Issue | Resolution |
| --- | --- |
| Port conflict | `lsof -i :3000` + terminate existing process before restart |
| Missing env vars | Copy `.env.example` → `.env`, fill keys (VITE_SUPABASE_URL etc.) |
| Supabase auth failure | Refresh CLI credentials: `supabase login` then `supabase link` |

# Verify:
markdownlint docs/guides/ONBOARDING_DAY_1.md
