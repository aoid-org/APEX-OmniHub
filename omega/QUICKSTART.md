# Protocol Omega - Quick Start Guide

## 🚀 Installation

**Zero installation required!** Protocol Omega uses only Python standard library and TypeScript.

### Verify Installation

```bash
npm run omega:test
```

Expected output:
```json
{"pending": 0, "approved": 0, "rejected": 0, "total_audits": 0}
✅ Protocol Omega operational
```

## 📋 Common Commands

### View Statistics
```bash
npm run omega:stats
```

### List Pending Approvals
```bash
npm run omega:list
```

### Approve a Task
```bash
npm run omega:approve <short_hash>

# Example:
npm run omega:approve a1b2c3d4
```

### Reject a Task
```bash
npm run omega:reject <short_hash> "Reason for rejection"

# Example:
npm run omega:reject a1b2c3d4 "Unauthorized operation"
```

### Start Web Dashboard
```bash
npm run omega:dashboard
```

Then open: **http://localhost:8042/dashboard**

## 🎯 Quick Examples

### Example 1: Request and Approve via CLI

```bash
# Request approval
python3 omega/engine.py request "Delete old logs" LOW

# Output shows:
# {
#   "status": "PENDING",
#   "short_hash": "a1b2c3d4",
#   ...
# }

# List pending
npm run omega:list

# Approve
npm run omega:approve a1b2c3d4
```

### Example 2: Use the Web Dashboard

```bash
# 1. Create some approvals
python3 omega/engine.py request "Modify database schema" MEDIUM
python3 omega/engine.py request "Export user data" HIGH

# 2. Start dashboard
npm run omega:dashboard

# 3. Open browser: http://localhost:8042/dashboard

# 4. Click "Approve" or "Reject" buttons
```

### Example 3: Run the Demo

```bash
# Run all demos
python3 omega/examples/demo.py

# Run specific demo
python3 omega/examples/demo.py 1  # Basic workflow
python3 omega/examples/demo.py 2  # Risk levels
python3 omega/examples/demo.py 3  # Rejection
```

## 🔒 Risk Levels

| Level | Description | Use Cases |
|-------|-------------|-----------|
| **LOW** | Safe operations | Read data, create backups, logging |
| **MEDIUM** | Moderate risk | Update configs, modify non-critical data |
| **HIGH** | Dangerous operations | Delete data, modify schemas, production changes |

## 🎨 Visual Dashboard Features

The web dashboard (`http://localhost:8042/dashboard`) provides:

- ✅ Real-time pending approvals
- 🎨 Color-coded risk levels (GREEN/YELLOW/RED)
- 📊 Statistics dashboard
- 🔘 One-click approve/reject
- 🔄 Auto-refresh every 30 seconds

## 📂 File Locations

| File | Location |
|------|----------|
| **Database** | `~/.apex/omega/verification.db` |
| **Engine** | `omega/engine.py` |
| **Dashboard** | `omega/dashboard.py` |
| **CLI** | `scripts/omega/cli.ts` |
| **Docs** | `omega/README.md` |
| **Demo** | `omega/examples/demo.py` |

## 🔧 Troubleshooting

### "tsx not found"

Use `npx tsx` instead:
```bash
npx tsx scripts/omega/cli.ts stats
```

Or install tsx globally:
```bash
npm install -g tsx
```

### "Port 8042 in use"

Stop the existing dashboard:
```bash
lsof -i :8042
kill <PID>
```

### "Python not found"

Ensure Python 3.11+ is installed:
```bash
python3 --version
```

## 📚 Learn More

- [Full Documentation](./README.md)
- [Database Schema](./README.md#database-schema)
- [API Reference](./README.md#api-reference)
- [Integration Guide](./README.md#integration-with-apex-systems)

## ✨ Key Features

- 🔒 **Zero Dependencies** - Python stdlib + TypeScript only
- 📊 **State-First** - SQLite persistence with WAL mode
- 🎨 **Visual Dashboards** - SVG + HTML approval UI
- 🔍 **Audit Trail** - Every action logged
- ⚡ **Fast** - O(1) hash-based lookups
- 🎯 **APEX Native** - Follows guardian/zero-trust patterns

---

**Need help?** Check the [full README](./README.md) or run `python3 omega/examples/demo.py`
