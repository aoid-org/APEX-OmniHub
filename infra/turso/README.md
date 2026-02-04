# Turso Device Registry - Setup Instructions

## Prerequisites

Install Turso CLI:

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell)
iwr https://get.tur.so/install.sh -useb | iex
```

## Database Creation

```bash
# Create the database
turso db create apex-devices

# Get the database URL
turso db show apex-devices --url

# Create an auth token
turso db tokens create apex-devices
```

## Schema Application

```bash
# Apply the schema
turso db shell apex-devices < infra/turso/device_registry.sql

# Verify schema
turso db shell apex-devices "SELECT name, sql FROM sqlite_master WHERE type='table';"
```

## Environment Configuration

Add to `.env`:

```bash
VITE_DEVICE_REGISTRY_MODE=dual
VITE_TURSO_URL=libsql://apex-devices-[your-org].turso.io
VITE_TURSO_AUTH_TOKEN=[your-token-here]
```

## Embedded Replica (Optional)

For local-first with remote sync:

```typescript
import { createClient } from "@libsql/client";

const client = createClient({
  url: "file://local.db",
  syncUrl: process.env.VITE_TURSO_URL,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN,
  syncInterval: 60, // sync every 60 seconds
});
```

Note: Embedded replica requires file system access (Node.js/Electron), not available in browser.

## Rollback

```bash
# Drop the database
turso db destroy apex-devices

# Or drop the table only
turso db shell apex-devices "DROP TABLE IF EXISTS device_registry;"
```
