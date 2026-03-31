# Local Authentication Setup

If you receive an `Invalid API Key` error upon login locally, this is due to missing or incorrectly configured Supabase environment variables.

Ensure your `.env.local` contains the correct keys:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```
