# APEX-OmniHub Rollback Plan

## Web Application (Cloudflare Pages)
- Revert commit on `main` and push.
- Or select prior deployment in Cloudflare dashboard and hit "Rollback".

## Database (Supabase)
- Apply the corresponding `down` migration scripts found in `supabase/migrations/down/`.
- Verify database state with `verify:supabase-security`.

## Orchestrator (Temporal Workers)
- Revert image tag in `docker-compose.prod.yml`.
- Run `docker compose up -d`
