"""OpenTelemetry bootstrap for the APEX Orchestrator (Temporal worker + FastAPI).

Exports traces to the OTLP endpoint configured via OTEL_EXPORTER_OTLP_ENDPOINT.
If the endpoint is not set, tracing is a no-op (safe for local dev).

Gap closed: 2.1 — Zero distributed tracing on Temporal/Python side.
"""

from __future__ import annotations

import logging
import os

from opentelemetry import trace
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

logger = logging.getLogger(__name__)


def init_otel(service_name: str = "apex-orchestrator") -> trace.Tracer:
    """Initialise OTel tracer. Safe to call multiple times (idempotent)."""

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

    resource  = Resource(attributes={SERVICE_NAME: service_name})
    provider  = TracerProvider(resource=resource)

    if otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
                OTLPSpanExporter,
            )
            exporter  = OTLPSpanExporter(endpoint=otlp_endpoint)
            processor = BatchSpanProcessor(exporter)
            provider.add_span_processor(processor)
            logger.info("OTel traces → %s", otlp_endpoint)
        except Exception:  # noqa: BLE001
            logger.warning("OTel OTLP exporter failed to initialise — tracing disabled.")
    else:
        logger.debug("OTEL_EXPORTER_OTLP_ENDPOINT not set — tracing is no-op.")

    trace.set_tracer_provider(provider)
    return trace.get_tracer(service_name)


# Module-level tracer singleton
tracer = init_otel()
