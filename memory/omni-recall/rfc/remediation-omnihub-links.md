# RFC: OmniHub Links Remediation

## Context
The Links module was previously relying on local React state and a hardcoded edge function response. 
A full Codebase Forensic Remediation Pass flagged this as a "Feature-Shaped Liability".

## Decision
We implemented a durable persistence layer for Links:
1. Created `omnilink_links` table with RLS.
2. Wired `omnilink-port` edge function to read from Postgres.
3. Updated `LinksModule.tsx` to insert to Postgres and reload to prove readback.

## Impact
- Architecture: Added a new table and wired an Edge function to the DB.
- Operational: Added new dependency on `omnilink_links` table.

## Author
APEX Codebase Forensic Auditor
