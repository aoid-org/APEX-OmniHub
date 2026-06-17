"""Python 3.10 UTC compatibility for orchestrator processes.

Python 3.11 introduced ``datetime.UTC``. CI currently runs orchestrator tests on
Python 3.10, where that alias is absent. Keep timestamp semantics identical by
installing the alias at interpreter startup when needed.
"""

from __future__ import annotations

import datetime as _datetime

if not hasattr(_datetime, "UTC"):
    _datetime.UTC = _datetime.timezone.utc
