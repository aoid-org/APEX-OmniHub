-- Security/performance indexes added 2026-01-29

-- Speed up wallet nonce lookups and expiry checks
create index if not exists wallet_nonces_wallet_expiry_idx
  on public.wallet_nonces (wallet_address, used_at, expires_at);

-- Tighten API key lookup
create index if not exists omnilink_api_keys_key_prefix_idx
  on public.omnilink_api_keys (key_prefix);

-- Enforce fast role checks for RBAC
create index if not exists user_roles_user_role_idx
  on public.user_roles (user_id, role);

-- Optional: chain tx log recency for webhook idempotency
create index if not exists chain_tx_log_created_idx
  on public.chain_tx_log (created_at);
