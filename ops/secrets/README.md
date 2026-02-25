# Production Docker Secrets

Create secrets before `docker compose -f docker-compose.prod.yml up`:

```bash
docker secret create supabase_url ./ops/secrets/supabase_url.txt
docker secret create supabase_service_role_key ./ops/secrets/supabase_service_role_key.txt
docker secret create supabase_db_url ./ops/secrets/supabase_db_url.txt
docker secret create openai_api_key ./ops/secrets/openai_api_key.txt
docker secret create anthropic_api_key ./ops/secrets/anthropic_api_key.txt
```

Required secrets:
- `supabase_url`
- `supabase_service_role_key`
- `supabase_db_url`
- `openai_api_key`
- `anthropic_api_key`
- `ALCHEMY_RPC_URL` and `INFURA_RPC_URL` should be provided through your deployment secret manager.

Never commit raw secret files. Keep only local `*.txt` files under `ops/secrets/`.
