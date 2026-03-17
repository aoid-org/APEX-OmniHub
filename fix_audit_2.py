path = 'orchestrator/models/audit.py'
with open(path, 'r') as f:
    c = f.read()

c = c.replace('await await ', 'await ')
c = c.replace('def get_tool_manifest() -> dict[str, Any]:', 'def get_tool_manifest(')
with open(path, 'w') as f:
    f.write(c)

with open('orchestrator/activities/tools.py', 'r') as f:
    c2 = f.read()

c2 = c2.replace('def get_tool_manifest(', 'def get_tool_manifest() -> dict[str, Any]:')
c2 = c2.replace('def test_call(', 'def test_call() -> dict[str, Any]:')

with open('orchestrator/activities/tools.py', 'w') as f:
    f.write(c2)
