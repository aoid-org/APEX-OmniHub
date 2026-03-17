import re

path = 'orchestrator/omniboard/service.py'
with open(path, 'r') as f: c = f.read()

# We accidentally replaced `record=` with `updates=` for both insert and update.
# We only want it for `update`!
# Line 315 is an insert.
# Let's revert `updates=` back to `record=` globally, and then explicitly fix `update` calls if they exist.
c = c.replace('updates={', 'record={')
c = c.replace('updates=updates', 'record=updates')

# Now let's check `update` calls:
c = c.replace('await db.update(\n            table="connections",\n            record=', 'await db.update(\n            table="connections",\n            updates=')

with open(path, 'w') as f:
    f.write(c)
