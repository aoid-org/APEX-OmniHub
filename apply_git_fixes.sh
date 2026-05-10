#!/bin/bash
echo "Removing tracked .env files..."
git rm --cached .env orchestrator/.env local-agents/.env
git commit -m "chore: remove tracked .env files per S-1/S-2"
echo "Done! Please rotate Supabase, Groq, Temporal JWT, and DB passwords."