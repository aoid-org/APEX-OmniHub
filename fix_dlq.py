path = 'orchestrator/activities/dlq_alert.py'
with open(path, 'r') as f:
    c = f.read()

c = c.replace('from prometheus_client import Counter [import-untyped]', 'from prometheus_client import Counter  # type: ignore')
c = c.replace('from prometheus_client.registry import REGISTRY [import-untyped]', 'from prometheus_client.registry import REGISTRY  # type: ignore')

with open(path, 'w') as f:
    f.write(c)
