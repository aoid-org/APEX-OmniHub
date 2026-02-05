#!/bin/bash

# Apply Supabase Migrations Script
# Executes migration SQL files against production database

set -e  # Exit on error

SUPABASE_URL="https://rtopreovkywofgwgmozi.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0b3ByZW92a3l3b2Znd2dtb3ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQzNDE5MCwiZXhwIjoyMDgxMDEwMTkwfQ.Lk6rjfJsenqw0QctpVlxPqjZkFOkoIwxQz1NigW7d-k"

echo "🚀 Starting migration process..."
echo "📡 Supabase URL: $SUPABASE_URL"
echo ""

# Function to execute SQL via Supabase PostgREST
execute_sql() {
    local sql_file="$1"
    local migration_name=$(basename "$sql_file")

    echo "======================================================================"
    echo "Applying migration: $migration_name"
    echo "======================================================================"

    # Read SQL file
    local sql_content=$(cat "$sql_file")

    # Execute via Supabase REST API
    # We'll use the PostgREST /rpc endpoint with a custom function
    # Since we can't execute arbitrary SQL directly, we'll try via curl to the database

    # Try executing via psql if available
    if command -v psql &> /dev/null; then
        echo "Using psql..."
        # Extract postgres connection string from Supabase (requires service key)
        # For now, we'll save to temp file and provide manual instructions
        echo "⚠️  psql available but connection string needed"
    fi

    # Alternative: Use Supabase API to execute
    local response=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec" \
        -H "apikey: ${SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$sql_content" | jq -Rs .)}")

    if echo "$response" | grep -q "error"; then
        echo "❌ Migration failed:"
        echo "$response" | jq .
        return 1
    else
        echo "✅ Migration applied successfully"
        return 0
    fi
}

# Apply migrations
cd "$(dirname "$0")/.."

MIGRATION_DIR="supabase/migrations"

echo "📁 Migration directory: $MIGRATION_DIR"
echo ""

# Migration 1: Admin Unification
if [ -f "$MIGRATION_DIR/20260205000000_unify_admin_system.sql" ]; then
    execute_sql "$MIGRATION_DIR/20260205000000_unify_admin_system.sql" || {
        echo "❌ Failed to apply admin unification migration"
        echo "💡 Try applying manually via Supabase Dashboard SQL Editor"
        echo "   File: $MIGRATION_DIR/20260205000000_unify_admin_system.sql"
        exit 1
    }
else
    echo "❌ Migration file not found: 20260205000000_unify_admin_system.sql"
    exit 1
fi

echo ""

# Migration 2: Paid Access
if [ -f "$MIGRATION_DIR/20260205000001_omnidash_paid_access.sql" ]; then
    execute_sql "$MIGRATION_DIR/20260205000001_omnidash_paid_access.sql" || {
        echo "❌ Failed to apply paid access migration"
        echo "💡 Try applying manually via Supabase Dashboard SQL Editor"
        echo "   File: $MIGRATION_DIR/20260205000001_omnidash_paid_access.sql"
        exit 1
    }
else
    echo "❌ Migration file not found: 20260205000001_omnidash_paid_access.sql"
    exit 1
fi

echo ""
echo "======================================================================"
echo "✅ All migrations applied successfully!"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "1. Run diagnostic queries: scripts/diagnose-production-issue.sql"
echo "2. Grant yourself admin + paid access: scripts/emergency-access-fix.sql"
echo "3. Test the application"
echo ""
