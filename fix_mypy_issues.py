import os
import re

def modify(path, func):
    if not os.path.exists(path): return
    with open(path, 'r') as f: c = f.read()
    nc = func(c)
    if nc != c:
        with open(path, 'w') as f: f.write(nc)
        print(f"Fixed {path}")

# 1. infrastructure/tidb_persistence.py
# Unused "type: ignore" comment [unused-ignore]
modify('orchestrator/infrastructure/tidb_persistence.py', lambda c: c.replace(' # type: ignore', ''))

# 2. activities/dlq_alert.py
modify('orchestrator/activities/dlq_alert.py', lambda c: c.replace(' # type: ignore', ''))

# 3. providers/database/supabase_provider.py
# Argument 2 to "upsert" has incompatible type "**dict[str, str]"; expected "ReturnMethod" or "CountMethod | None" or "bool"
# Wait, let's see line 143:
# return await self.client.table(table).upsert(record, **kwargs).execute()
# `kwargs` shouldn't be unpacked as `**kwargs` into `upsert` if `upsert` doesn't take generic kwargs.
# Let's check `providers/database/supabase_provider.py` first.
