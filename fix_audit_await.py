import re

path = 'orchestrator/models/audit.py'
with open(path, 'r') as f:
    c = f.read()

# Fix "Unused "type: ignore" comment"
c = c.replace('  # type: ignore[return-value]', '')

# Fix "Incompatible return value type (got "Coroutine[Any, Any, str]", expected "str")"
# In `log_audit_event`: return audit_logger.log_event(event) -> return await audit_logger.log_event(event)
c = c.replace('return audit_logger.log_event(event)', 'return await audit_logger.log_event(event)')

# Fix "Value of type 'Coroutine[Any, Any, None]' must be used"
# `self._store_event(event)` -> `await self._store_event(event)`
c = c.replace('self._store_event(event)', 'await self._store_event(event)')
c = c.replace('self._store_supabase(event)', 'await self._store_supabase(event)')
c = c.replace('self._store_file(event)', 'await self._store_file(event)')

# Fix db.insert missing await
c = c.replace('db.insert(\n                table="audit_logs",', 'await db.insert(\n                table="audit_logs",')
c = c.replace('f.write(json.dumps(event.model_dump(), default=str) + "\\n")', 'await f.write(json.dumps(event.model_dump(), default=str) + "\\n")')

with open(path, 'w') as f:
    f.write(c)
