import os
import re

def modify(path, func):
    with open(path, 'r') as f: c = f.read()
    nc = func(c)
    if nc != c:
        with open(path, 'w') as f: f.write(nc)
        print(f"Fixed {path}")

# omniboard/fsm.py
modify('orchestrator/omniboard/fsm.py', lambda c: c.replace('import nest_asyncio', 'import nest_asyncio  # type: ignore'))

# activities/tools.py
modify('orchestrator/activities/tools.py', lambda c: c.replace('import jsonschema', 'import jsonschema  # type: ignore'))
modify('orchestrator/activities/tools.py', lambda c: c.replace('def get_tool_manifest(', 'def get_tool_manifest() -> dict[str, Any]:').replace('def test_call(', 'def test_call() -> dict[str, Any]:'))
# Wait, let's check `get_tool_manifest` arguments first.
