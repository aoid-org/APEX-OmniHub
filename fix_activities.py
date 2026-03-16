import re

with open('orchestrator/activities/tools.py', 'r') as f:
    content = f.read()

# Replace:
# cached = await _idempotency_guard(db, idempotency_key, "send_email", workflow_id)
# With:
# cached = await _idempotency_guard(db, idempotency_key, "send_email", workflow_id or "unknown-workflow")

content = re.sub(
    r'cached = await _idempotency_guard\(db, idempotency_key, "send_email", workflow_id\)',
    r'cached = await _idempotency_guard(db, idempotency_key, "send_email", str(workflow_id or "unknown-workflow"))',
    content
)

content = re.sub(
    r'cached = await _idempotency_guard\(db, idempotency_key, "call_webhook", workflow_id\)',
    r'cached = await _idempotency_guard(db, idempotency_key, "call_webhook", str(workflow_id or "unknown-workflow"))',
    content
)

with open('orchestrator/activities/tools.py', 'w') as f:
    f.write(content)
