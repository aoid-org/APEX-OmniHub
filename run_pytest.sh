source orchestrator/.venv/bin/activate || true
cd orchestrator
python -m pytest -q
coverage run -m pytest
coverage report --fail-under=94
