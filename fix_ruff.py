import os
import re

def modify(path, func):
    with open(path, 'r') as f: c = f.read()
    nc = func(c)
    if nc != c:
        with open(path, 'w') as f: f.write(nc)
        print(f"Fixed {path}")

# orchestrator/tests/test_audit.py
modify('orchestrator/tests/test_audit.py', lambda c: c.replace('args, kw_ = mock_db.insert.call_args', '_, kwargs = mock_db.insert.call_args'))

# orchestrator/tests/test_dlq_alert.py
# The code was `mock_http_client = AsyncMock()`, and we replaced it with `_ = AsyncMock()`.
modify('orchestrator/tests/test_dlq_alert.py', lambda c: c.replace('_ = AsyncMock()', 'mock_http_client = AsyncMock()'))
