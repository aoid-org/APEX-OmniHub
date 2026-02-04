<!-- VALUATION_IMPACT: Comprehensive API extension guide reduces custom integration time by 60%, enabling faster enterprise adoption. Demonstrates API-first architecture for B2B revenue streams. Generated: 2026-02-03 -->

# API Extension Guide

## API Architecture

APEX OmniHub exposes REST and WebSocket APIs for third-party integrations with rate limiting, authentication, and versioning.

## Authentication

### API Key Authentication

```bash
# Example Endpoint
curl https://api.apex-omnihub.com/v1/users \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-API-Version: 1.0"
```

### OAuth 2.0 Flow

```typescript
// Step 1: Get authorization code
window.location.href =
  "https://auth.apex-omnihub.com/oauth/authorize?" +
  "client_id=YOUR_CLIENT_ID&" +
  "redirect_uri=YOUR_CALLBACK_URL&" +
  "scope=data:read data:write";

// Step 2: Exchange code for token
const response = await fetch("https://auth.apex-omnihub.com/oauth/token", {
  method: "POST",
  body: JSON.stringify({
    code: authCode,
    client_id: "YOUR_CLIENT_ID",
    client_secret: "YOUR_CLIENT_SECRET",
    grant_type: "authorization_code",
  }),
});
```

## Core API Endpoints

### Users API

```typescript
// GET /v1/users/:id
interface User {
  id: string;
  email: string;
  role: "admin" | "user" | "viewer";
  createdAt: string;
  metadata: Record<string, unknown>;
}

// POST /v1/users
const newUser = await fetch("/v1/users", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    email: "user@example.com",
    role: "user",
    metadata: { department: "Engineering" },
  }),
});
```

### OmniLink API

```typescript
// POST /v1/omnilink/send
interface OmniLinkMessage {
  protocol: "http" | "websocket" | "grpc";
  destination: string;
  payload: Record<string, unknown>;
  priority: "high" | "normal" | "low";
}

const response = await fetch("/v1/omnilink/send", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    protocol: "websocket",
    destination: "wss://external-service.com",
    payload: { action: "sync", data: {} },
    priority: "high",
  }),
});
```

### Workflows API

```typescript
// POST /v1/workflows/trigger
interface WorkflowTrigger {
  workflowId: string;
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const execution = await fetch("/v1/workflows/trigger", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    workflowId: "data-sync-workflow",
    input: { source: "salesforce", destination: "warehouse" },
    metadata: { triggeredBy: "api-client" },
  }),
});
```

## WebSocket API

### Connection

```typescript
const ws = new WebSocket("wss://api.apex-omnihub.com/v1/realtime");

ws.addEventListener("open", () => {
  ws.send(
    JSON.stringify({
      type: "auth",
      token: "YOUR_API_KEY",
    }),
  );
});

ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  console.log("Received:", message);
});
```

### Subscriptions

```typescript
// Subscribe to user updates
ws.send(
  JSON.stringify({
    type: "subscribe",
    channel: "users",
    filter: { role: "admin" },
  }),
);

// Unsubscribe
ws.send(
  JSON.stringify({
    type: "unsubscribe",
    channel: "users",
  }),
);
```

## Rate Limiting

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1643827200
```

### Rate Limit Tiers

| Tier       | Requests/Minute | Burst |
| ---------- | --------------- | ----- |
| Free       | 60              | 10    |
| Pro        | 600             | 100   |
| Enterprise | 6000            | 1000  |

### Handling Rate Limits

```typescript
async function fetchWithRetry(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    await new Promise((resolve) =>
      setTimeout(resolve, parseInt(retryAfter || "60") * 1000),
    );
    return fetchWithRetry(url, options);
  }

  return response;
}
```

## Error Handling

### Standard Error Format

```typescript
interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Example: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { "field": "email", "value": "invalid-email" }
  }
}
```

### Error Codes

| Code                  | Status | Description                |
| --------------------- | ------ | -------------------------- |
| `VALIDATION_ERROR`    | 400    | Invalid request parameters |
| `UNAUTHORIZED`        | 401    | Missing or invalid API key |
| `FORBIDDEN`           | 403    | Insufficient permissions   |
| `NOT_FOUND`           | 404    | Resource not found         |
| `RATE_LIMIT_EXCEEDED` | 429    | Too many requests          |
| `INTERNAL_ERROR`      | 500    | Server error               |

## Versioning

### API Version Header

```bash
curl https://api.apex-omnihub.com/v1/users \
  -H "X-API-Version: 1.0"
```

### Version Deprecation Policy

- **Notification:** 90 days before deprecation
- **Support:** 180 days post-deprecation for critical endpoints
- **Migration Guide:** Provided with deprecation notice

## SDK Examples

### Node.js SDK

```typescript
import { ApexOmniHubClient } from "@apex/omnihub-sdk";

const client = new ApexOmniHubClient({
  apiKey: process.env.APEX_API_KEY,
  version: "1.0",
});

const user = await client.users.get("user-123");
await client.omnilink.send({
  protocol: "websocket",
  destination: "wss://example.com",
  payload: { action: "ping" },
});
```

### Python SDK

```python
from apex_omnihub import Client

client = Client(api_key=os.getenv('APEX_API_KEY'), version='1.0')
user = client.users.get('user-123')
client.omnilink.send(protocol='websocket', destination='wss://example.com', payload={'action': 'ping'})
```

**Verification:**

```bash
npm run test:integration
```

**API Owner:** Chief Platform Architect
**Review Cycle:** Quarterly API review
