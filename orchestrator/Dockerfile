# Multi-stage build for APEX Orchestrator
# Stage 1: Builder - install dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml ./

# Force CPU-only PyTorch BEFORE main install.
# Prevents sentence-transformers from pulling ~4GB GPU/CUDA torch.
# Orchestrator runs on CPU — no NVIDIA drivers needed.
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -e ".[dev]"

# Stage 2: Runtime - minimal image
FROM python:3.11-slim

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY models ./models
COPY infrastructure ./infrastructure
COPY workflows ./workflows
COPY activities ./activities
COPY core ./core
COPY observability ./observability
COPY security ./security
COPY policies ./policies
COPY providers ./providers
COPY omniboard ./omniboard
COPY config.py main.py server.py metrics.py worker_healthcheck.py ./

# Create non-root user
RUN useradd -m -u 1000 orchestrator && \
    chown -R orchestrator:orchestrator /app

USER orchestrator

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["python", "worker_healthcheck.py"]

# Default command
CMD ["python", "main.py", "worker"]
