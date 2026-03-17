import os
import re

def modify(path, func):
    with open(path, 'r') as f: c = f.read()
    nc = func(c)
    if nc != c:
        with open(path, 'w') as f: f.write(nc)
        print(f"Fixed {path}")

# 1. orchestrator/omniboard/router.py
modify('orchestrator/omniboard/router.py', lambda c: re.sub(r'\[str, Any\]', '', c))

# 2. TypeScript Syntax Errors: RouteErrorBoundary.tsx, ZIndexManager.ts, entitlements-service.ts
modify('apps/omnihub-site/src/components/RouteErrorBoundary.tsx', lambda c: c.replace('readonly readonly', 'readonly'))
modify('apps/omnihub-site/src/lib/ZIndexManager.ts', lambda c: c.replace('readonly readonly', 'readonly'))
modify('src/omniconnect/entitlements/entitlements-service.ts', lambda c: c.replace('readonly readonly', 'readonly'))

# 3. src/integrations/maestro/execution/engine.ts
modify('src/integrations/maestro/execution/engine.ts', lambda c: c.replace("options.baseUrl.replace(/\\/+$/, '') // NOSONAR + EXECUTE_PATH;", "options.baseUrl.replace(/\\/+$/, '') + EXECUTE_PATH; // NOSONAR").replace("envBase.replace(/\\/+$/, '') // NOSONAR + EXECUTE_PATH;", "envBase.replace(/\\/+$/, '') + EXECUTE_PATH; // NOSONAR"))

# 4. stores/omniDashStore.ts redundant globalThis
modify('apps/omnihub-site/src/stores/omniDashStore.ts', lambda c: c.replace('globalThis.globalThis.window.', 'globalThis.window.'))
