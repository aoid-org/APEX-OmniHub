import re

path = "orchestrator/models/audit.py"
with open(path, "r") as f:
    c = f.read()

# We replaced `async def` with `def` earlier. We should revert it because it breaks await calls.
c = c.replace("def get_audit_trail", "async def get_audit_trail")

with open(path, "w") as f:
    f.write(c)
