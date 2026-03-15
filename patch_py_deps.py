with open("orchestrator/pyproject.toml") as f:
    content = f.read()

deps_old = """    "numpy>=1.26.0",
    "prometheus-client>=0.20.0",
]"""

deps_new = """    "numpy>=1.26.0",
    "prometheus-client>=0.20.0",
    "opentelemetry-api>=1.27.0",
    "opentelemetry-sdk>=1.27.0",
    "opentelemetry-instrumentation-httpx>=0.48b0",
    "opentelemetry-exporter-otlp-proto-http>=1.27.0",
]"""

if deps_old in content:
    content = content.replace(deps_old, deps_new)
else:
    print("Could not find the dependency block to patch")

with open("orchestrator/pyproject.toml", "w") as f:
    f.write(content)
