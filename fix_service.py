import re

path = 'orchestrator/omniboard/service.py'
with open(path, 'r') as f:
    c = f.read()

c = c.replace('from authlib.integrations.httpx_client import AsyncOAuth2Client', 'from authlib.integrations.httpx_client import AsyncOAuth2Client  # type: ignore')
c = c.replace('record=updates', 'updates=updates').replace('record={', 'updates={')

with open(path, 'w') as f:
    f.write(c)
