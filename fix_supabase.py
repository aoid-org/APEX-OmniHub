import re

path = 'orchestrator/providers/database/supabase_provider.py'
with open(path, 'r') as f:
    c = f.read()

# Add type: ignore to line 143:
c = c.replace('query = self.client.table(validated_table).upsert(record, **upsert_kwargs)', 'query = self.client.table(validated_table).upsert(record, **upsert_kwargs)  # type: ignore')

with open(path, 'w') as f:
    f.write(c)

# 4. omniboard/service.py: "authlib.integrations.httpx_client" stubs
path2 = 'orchestrator/omniboard/service.py'
with open(path2, 'r') as f:
    c2 = f.read()

c2 = c2.replace('from authlib.integrations.httpx_client import AsyncOAuth2Client', 'from authlib.integrations.httpx_client import AsyncOAuth2Client  # type: ignore')
# 5. omniboard/service.py: Unexpected keyword argument "record" for "update" of "DatabaseProvider"
# DatabaseProvider.update(table=..., record=...) vs update(table=..., data=...)?
# Let's check DatabaseProvider.update.
with open('orchestrator/providers/database/base.py', 'r') as f:
    c_base = f.read()
