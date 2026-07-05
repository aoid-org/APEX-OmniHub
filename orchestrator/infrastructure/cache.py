"""
Semantic Caching with Redis Vector Search and Plan Templates.

This module implements intelligent plan caching that goes beyond simple key-value:

1. **Plan Template Extraction**: Converts "Book flight to Paris tomorrow"
   into template "Book flight to {DESTINATION} {DATE}"

2. **Vector Search**: Uses sentence embeddings for semantic similarity matching
   - Cache hit even if wording differs: "Fly to NYC" matches "Book flight to {DESTINATION}"

3. **Parameter Injection**: Rehydrates cached plans with actual values
   - Template: "Book flight to {DESTINATION}" + {"DESTINATION": "Paris"} → executable plan

4. **TTL Management**: Automatic expiration to prevent stale plans

Why This Matters:
- Reduces LLM calls by ~70% for common patterns (major cost + latency savings)
- Improves consistency (same pattern → same plan structure)
- Enables plan analytics (which templates are most common)

Architecture:
- Redis Vector Similarity Search (VSS) with HNSW index for <10ms lookups
- Sentence-transformers for embedding generation (all-MiniLM-L6-v2, 384 dimensions)
- Entity extraction via regex patterns (extensible to NER models)
"""

import hashlib
import json
import logging
import re
from importlib import metadata
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import numpy as np
import redis.asyncio as aioredis
from pydantic import BaseModel, Field
from redis.commands.search.field import NumericField, TextField, VectorField
from redis.commands.search.query import Query

from infrastructure.tidb_persistence import get_tidb_store

# NOTE (FR4): sentence_transformers is imported lazily inside
# SemanticCacheService.__init__, and only when a model *name* is given — its
# transitive torch import is what OOMs a 512 MB worker, so it must never load
# when an encoder object is injected. This module-level name stays None at
# runtime; it exists so tests can patch("infrastructure.cache.SentenceTransformer").
SentenceTransformer: Any = None

# Redis search imports - handle multiple redis-py versions
try:
    # Try redis-py v4.x path
    from redis.commands.search.index_definition import IndexDefinition, IndexType
except ImportError:
    try:
        # Try redis-py v5.x alternate path
        from redis.commands.search.indexDefinition import (  # type: ignore[no-redef]
            IndexDefinition,
            IndexType,
        )
    except ImportError:
        # Fallback: define minimal stubs for typing (tests can mock these).
        # Intentional runtime redefinition across a version-compat try/except
        # ladder -- mypy cannot narrow this statically across branches.
        IndexDefinition = type("IndexDefinition", (), {})  # type: ignore[misc,assignment]
        IndexType = type("IndexType", (), {})  # type: ignore[misc,assignment]

logger = logging.getLogger(__name__)

REDIS_SEARCH_COMPATIBILITY_REMEDIATION = (
    "Update orchestrator Redis Search compatibility helper or pin redis to a version that "
    "provides the expected IndexDefinition/IndexType API."
)


def _qualified_name(obj: Any) -> str:
    """Return a best-effort import path for diagnostics without raising."""
    module = getattr(obj, "__module__", None)
    qualname = getattr(obj, "__qualname__", None) or getattr(obj, "__name__", None)
    if module and qualname:
        return f"{module}.{qualname}"
    return repr(obj)


def _package_version(package_name: str) -> str:
    """Return installed package version for startup diagnostics."""
    try:
        return metadata.version(package_name)
    except metadata.PackageNotFoundError:
        return "not installed"
    except Exception as exc:  # noqa: BLE001 - diagnostic helper must never mask root cause
        return f"unknown ({exc.__class__.__name__}: {exc})"


def _redis_hash_index_type() -> Any:
    """
    Select the RediSearch HASH index type across redis-py API variants.

    redis-py releases disagree on whether ``IndexType.HASH`` is present while
    still accepting the literal ``"HASH"``. Never dereference the enum member
    without this guard; Render workers must not crash-loop on import/API drift.
    """
    hash_index_type = getattr(IndexType, "HASH", None)
    return hash_index_type if hash_index_type is not None else "HASH"


def validate_redis_search_compatibility() -> None:
    """
    Fail fast with actionable diagnostics if the installed Redis Search API drifts.

    This deliberately constructs an IndexDefinition using the compatibility
    helper before startup creates the real vector index. Any dependency mismatch
    should become one clear RuntimeError instead of an opaque AttributeError in
    Render crash-loop logs.
    """
    missing_classes = [
        name
        for name, value in {
            "IndexDefinition": IndexDefinition,
            "IndexType": IndexType,
            "TextField": TextField,
            "NumericField": NumericField,
            "VectorField": VectorField,
            "Query": Query,
        }.items()
        if value is None or (isinstance(value, type) and value.__module__ == "builtins")
    ]

    hash_index_type: Any = None
    invalid_api: str | None = None
    try:
        hash_index_type = _redis_hash_index_type()
        IndexDefinition(prefix=["apex-compatibility-check:"], index_type=hash_index_type)
    except Exception as exc:  # noqa: BLE001 - convert all API drift into clear RuntimeError
        invalid_api = (
            f"IndexDefinition rejected selected HASH index type {hash_index_type!r}: "
            f"{exc.__class__.__name__}: {exc}"
        )

    if missing_classes or invalid_api:
        details = []
        if missing_classes:
            details.append(f"missing required RediSearch API: {', '.join(missing_classes)}")
        if invalid_api:
            details.append(invalid_api)
        raise RuntimeError(
            "Redis Search compatibility check failed; "
            f"redis={_package_version('redis')}; "
            f"redisvl={_package_version('redisvl')}; "
            f"redis-om={_package_version('redis-om')}; "
            f"IndexDefinition={_qualified_name(IndexDefinition)}; "
            f"IndexType={_qualified_name(IndexType)}; "
            f"issue={' | '.join(details)}. "
            f"Remediation: {REDIS_SEARCH_COMPATIBILITY_REMEDIATION}"
        )


def _safe_redis_url(redis_url: str) -> str:
    """
    Return a log-safe Redis URL preserving endpoint shape while redacting secrets.

    Preserves scheme, host, port, and path; removes query strings; redacts any
    username/password/token present in the authority. Invalid URLs are handled
    without raising and without echoing possible credentials.
    """
    try:
        parts = urlsplit(redis_url)
        if not parts.scheme or not parts.netloc:
            return "<invalid-redis-url>"

        host = parts.hostname
        if not host:
            return f"{parts.scheme}://<invalid-host>{parts.path or ''}"

        host_display = f"[{host}]" if ":" in host and not host.startswith("[") else host
        if parts.port is not None:
            host_display = f"{host_display}:{parts.port}"

        netloc = f"<redacted>@{host_display}" if parts.username or parts.password else host_display

        return urlunsplit((parts.scheme, netloc, parts.path, "", ""))
    except Exception:  # noqa: BLE001 - logging sanitizer must never crash startup
        return "<invalid-redis-url>"


# ============================================================================
# DATA MODELS
# ============================================================================


class PlanTemplate(BaseModel):
    """
    Plan template with parameterized slots.

    Example:
        template_text: "Book flight to {DESTINATION} on {DATE}"
        parameter_slots: ["DESTINATION", "DATE"]
        plan_steps: [
            {"action": "search_flights", "params": {"to": "{DESTINATION}", "date": "{DATE}"}},
            {"action": "book_flight", "params": {"flight_id": "{FLIGHT_ID}"}}
        ]
    """

    template_id: str = Field(..., description="Unique template identifier (hash)")
    template_text: str = Field(..., description="Parameterized template string")
    parameter_slots: list[str] = Field(..., description="List of parameter names")
    plan_steps: list[dict[str, Any]] = Field(
        ..., description="Execution steps with {PARAM} placeholders"
    )
    embedding: list[float] = Field(..., description="Sentence embedding (384d)")
    hit_count: int = Field(default=0, description="Number of cache hits")
    created_at: str = Field(..., description="ISO 8601 timestamp")
    ttl_seconds: int = Field(default=86400, description="Time to live (24h default)")

    class Config:
        frozen = True


class CachedPlan(BaseModel):
    """
    Fully rehydrated plan ready for execution.

    This is what gets returned to the workflow when there's a cache hit.
    """

    plan_id: str = Field(..., description="Unique plan instance ID")
    template_id: str = Field(..., description="Source template ID")
    steps: list[dict[str, Any]] = Field(..., description="Executable steps (params injected)")
    parameters: dict[str, str] = Field(..., description="Extracted parameter values")
    cache_hit: bool = Field(default=True)
    similarity_score: float = Field(..., description="Cosine similarity (0-1)")


# ============================================================================
# ENTITY EXTRACTION
# ============================================================================


class EntityExtractor:
    """
    Extract entities from natural language to create plan templates.

    Current implementation uses regex patterns. Can be upgraded to:
    - spaCy NER for better accuracy
    - LLM-based extraction for complex entities
    - Custom entity models per domain (flights, hotels, etc.)
    """

    # Entity patterns (regex-based - simple but fast)
    PATTERNS = {
        "DATE": [
            r"\b(tomorrow|today|yesterday)\b",
            r"\b\d{1,2}/\d{1,2}/\d{2,4}\b",  # MM/DD/YYYY
            r"\b\d{4}-\d{2}-\d{2}\b",  # YYYY-MM-DD
            r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b",
        ],
        "LOCATION": [
            r"\b(paris|london|new york|nyc|tokyo|sydney|berlin|rome)\b",
            r"\bto\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",  # "to Paris"
        ],
        "PERSON": [
            r"\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b",  # "John Doe"
        ],
        "AMOUNT": [
            r"\$\d+(?:,\d{3})*(?:\.\d{2})?",  # $1,000.00
            r"\b\d+\s*(?:dollars?|euros?|pounds?)\b",
        ],
        "EMAIL": [
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        ],
    }

    # Pre-compiled patterns for performance
    _COMPILED_PATTERNS = {k: [re.compile(p, re.IGNORECASE) for p in v] for k, v in PATTERNS.items()}

    @classmethod
    def extract_entities(cls, text: str) -> dict[str, list[str]]:
        """
        Extract entities from text using regex patterns.

        Returns:
            Dict mapping entity type to list of extracted values
            Example: {"DATE": ["tomorrow"], "LOCATION": ["Paris"]}
        """
        entities: dict[str, list[str]] = {}

        for entity_type, patterns in cls._COMPILED_PATTERNS.items():
            matches = []
            for pattern in patterns:
                found = pattern.findall(text)
                if found:
                    # Handle both string matches and tuple matches from groups
                    matches.extend(found if isinstance(found[0], str) else [m for m in found if m])

            if matches:
                entities[entity_type] = list(set(matches))  # Deduplicate

        return entities

    @classmethod
    def create_template(cls, text: str) -> tuple[str, dict[str, str]]:
        """
        Convert natural language into parameterized template.

        Args:
            text: "Book flight to Paris tomorrow"

        Returns:
            template: "Book flight to {LOCATION} {DATE}"
            parameters: {"LOCATION": "Paris", "DATE": "tomorrow"}

        Example:
            >>> template, params = EntityExtractor.create_template("Book flight to Paris tomorrow")
            >>> assert template == "Book flight to {LOCATION} {DATE}"
            >>> assert params == {"LOCATION": "Paris", "DATE": "tomorrow"}
        """
        entities = cls.extract_entities(text)
        template = text
        parameters = {}

        # Replace entities with placeholders (in order of appearance)
        for entity_type, values in entities.items():
            for idx, value in enumerate(values):
                # Use indexed placeholders if multiple of same type
                placeholder = f"{{{entity_type}_{idx}}}" if idx > 0 else f"{{{entity_type}}}"
                template = template.replace(value, placeholder, 1)
                parameters[placeholder.strip("{}")] = value

        return template, parameters


# ============================================================================
# SEMANTIC CACHE SERVICE
# ============================================================================


class SemanticCacheService:
    """
    Redis-based semantic cache with vector similarity search.

    Features:
    - Plan template extraction and caching
    - Cosine similarity search using HNSW index
    - Parameter injection for plan rehydration
    - TTL-based expiration
    - Hit count tracking for analytics

    Why Redis VSS:
    - Sub-10ms vector search at scale
    - Built-in HNSW index (faster than brute force)
    - Atomic operations for thread safety
    - Persistence + replication support

    Usage:
        cache = SemanticCacheService(redis_url="redis://localhost:6379")
        await cache.initialize()

        # Try to get cached plan
        cached = await cache.get_plan("Book flight to Paris tomorrow")
        if cached:
            return cached  # Skip LLM call

        # Generate new plan via LLM
        plan = await generate_plan_with_llm(goal)

        # Cache for future hits
        await cache.store_plan(goal, plan)
    """

    def __init__(
        self,
        redis_url: str,
        redis_password: str | None = None,
        redis_ssl: bool = False,
        embedding_model: str | Any = "all-MiniLM-L6-v2",
        similarity_threshold: float = 0.85,
        ttl_seconds: int = 86400,  # 24 hours
    ):
        """
        Initialize semantic cache service.

        Args:
            redis_url: Redis connection URL
            redis_password: Optional Redis password
            redis_ssl: Whether to use SSL for connection
            embedding_model: Sentence-transformers model name, OR a pre-built
                encoder object exposing encode()/get_sentence_embedding_dimension()
                (e.g. infrastructure.lite_embedder.LiteEmbedder for 512 MB workers)
            similarity_threshold: Minimum cosine similarity for cache hit (0-1)
            ttl_seconds: Default TTL for cached plans
        """
        self.redis_url = redis_url
        self.redis_password = redis_password
        self.redis_ssl = redis_ssl
        self.similarity_threshold = similarity_threshold
        self.ttl_seconds = ttl_seconds

        # Redis client (async)
        self.redis: aioredis.Redis[bytes] | None = None  # type: ignore[type-arg]

        if isinstance(embedding_model, str):
            # Heavy path: lazy import so injected-encoder deployments never
            # pay the torch memory cost (see module import note). Tests patch
            # the module-level SentenceTransformer name instead.
            logger.info(f"Loading embedding model: {embedding_model}...")
            transformer_cls = SentenceTransformer
            if transformer_cls is None:
                from sentence_transformers import SentenceTransformer as _LazyST

                transformer_cls = _LazyST

            self.embedding_model = transformer_cls(embedding_model)
            namespace = ""
        else:
            self.embedding_model = embedding_model
            namespace = getattr(embedding_model, "cache_namespace", "custom")
            logger.info(f"Using injected embedding encoder (namespace={namespace})")
        self.embedding_dim = self.embedding_model.get_sentence_embedding_dimension()
        logger.info(f"Model loaded ({self.embedding_dim} dimensions)")

        # Redis index/key namespace. Vector spaces from different encoders are
        # NOT comparable, so each encoder gets an isolated index + key prefix.
        suffix = f":{namespace}" if namespace else ""
        self.index_name = f"idx:plan_templates{suffix}"
        self.key_prefix = f"plan{suffix}:"

    async def initialize(self) -> None:
        """
        Initialize Redis connection and create vector search index.

        This MUST be called before using the cache (typically in main.py startup).
        """
        # Never pass `ssl=` to from_url(). The URL scheme alone (rediss://)
        # already selects SSLConnection inside redis-py; an explicit ssl=
        # kwarg survives from_url()'s URL-derived kwargs merge and is then
        # forwarded to SSLConnection/AbstractConnection.__init__(), which
        # does not accept it (redis[hiredis]>=5.0.0,<6.0.0) -- this was
        # crashing every worker boot with "unexpected keyword argument
        # 'ssl'" whenever redis_ssl=True. self.redis_ssl is kept only for
        # logging/back-compat; it must never reach from_url() kwargs.
        self.redis = await aioredis.from_url(
            self.redis_url,
            password=self.redis_password,
            encoding="utf-8",
            decode_responses=True,
        )
        logger.info(f"Connected to Redis: {_safe_redis_url(self.redis_url)}")

        # Validate RediSearch client API before index creation so dependency
        # drift fails once with a clear RuntimeError instead of a Render crash loop.
        validate_redis_search_compatibility()

        # Create vector search index (idempotent)
        await self._create_index()

    async def _create_index(self) -> None:
        """
        Create Redis vector search index with HNSW algorithm.

        Schema:
        - template_id (TEXT): Unique template hash
        - template_text (TEXT): Parameterized template
        - embedding (VECTOR): 384-dim float32 embedding
        - hit_count (NUMERIC): Number of cache hits
        - created_at (TEXT): ISO 8601 timestamp

        Why HNSW:
        - Approximate Nearest Neighbor (ANN) search in O(log N)
        - Better than brute force for >1000 templates
        - Tunable accuracy/speed tradeoff via M and EF_CONSTRUCTION
        """
        if not self.redis:
            raise RuntimeError("Redis not initialized - call initialize() first")

        try:
            # Check if index exists
            await self.redis.ft(self.index_name).info()
            logger.info(f"Vector index already exists: {self.index_name}")
            return
        except Exception:  # noqa: S110 - Expected: index may not exist yet
            # Index doesn't exist - will be created below
            logger.info(f"Vector index not found, creating: {self.index_name}")

        # Define index schema
        schema = [
            TextField("template_id"),
            TextField("template_text"),
            VectorField(
                "embedding",
                "HNSW",  # Hierarchical Navigable Small World
                {
                    "TYPE": "FLOAT32",
                    "DIM": self.embedding_dim,
                    "DISTANCE_METRIC": "COSINE",  # Cosine similarity
                    "INITIAL_CAP": 1000,
                    "M": 16,  # HNSW param: connections per node
                    "EF_CONSTRUCTION": 200,  # HNSW param: build quality
                },
            ),
            NumericField("hit_count"),
            TextField("created_at"),
        ]

        # Create index
        await self.redis.ft(self.index_name).create_index(
            fields=schema,
            definition=IndexDefinition(
                prefix=[self.key_prefix], index_type=_redis_hash_index_type()
            ),
        )
        logger.info(f"Created vector index: {self.index_name}")

    async def get_plan(self, goal: str) -> CachedPlan | None:
        """
        Try to retrieve cached plan for given goal.

        Process:
        1. Extract template from goal: "Book flight to Paris" → "Book flight to {LOCATION}"
        2. Embed template using sentence-transformers
        3. Vector search in Redis for similar templates (cosine similarity)
        4. If similarity >= threshold, inject parameters and return plan
        5. Else return None (cache miss)

        Args:
            goal: User's goal in natural language

        Returns:
            CachedPlan if cache hit (similarity >= threshold), else None
        """
        if not self.redis:
            raise RuntimeError("Redis not initialized")

        # Step 1: Extract template and parameters
        template_text, parameters = EntityExtractor.create_template(goal)

        # Step 2: Embed template
        embedding = self.embedding_model.encode(template_text, convert_to_numpy=True)
        embedding_bytes = embedding.astype(np.float32).tobytes()

        # Step 3: Vector similarity search
        query = (
            Query("*=>[KNN 1 @embedding $vec AS score]")
            .return_fields("template_id", "template_text", "plan_steps", "score")
            .sort_by("score")
            .dialect(2)
        )

        try:
            results = await self.redis.ft(self.index_name).search(  # type: ignore[misc]
                query,
                query_params={"vec": embedding_bytes},
            )
        except Exception as e:
            logger.exception(f"Vector search failed: {e}")
            return None

        # Step 4: Check similarity threshold
        if not results.docs:
            return None

        best_match = results.docs[0]
        similarity = 1.0 - float(best_match.score)  # Redis returns distance, we want similarity

        if similarity < self.similarity_threshold:
            logger.info(f"Cache miss (similarity={similarity:.3f} < {self.similarity_threshold})")
            return None

        # Step 5: Rehydrate plan with actual parameters
        template_id = best_match.template_id
        plan_steps_json = await self.redis.hget(  # type: ignore[misc]
            f"{self.key_prefix}{template_id}", "plan_steps"
        )

        if not plan_steps_json:
            return None

        plan_steps = json.loads(plan_steps_json)

        # Inject parameters into plan steps
        injected_steps = self._inject_parameters(plan_steps, parameters)

        # Increment hit count
        await self.redis.hincrby(  # type: ignore[misc]
            f"{self.key_prefix}{template_id}", "hit_count", 1
        )

        logger.info(f"Cache HIT (similarity={similarity:.3f}, template={template_id})")

        return CachedPlan(
            plan_id=self._generate_plan_id(goal),
            template_id=template_id,
            steps=injected_steps,
            parameters=parameters,
            cache_hit=True,
            similarity_score=similarity,
        )

    async def store_plan(
        self,
        goal: str,
        plan_steps: list[dict[str, Any]],
        ttl_seconds: int | None = None,
    ) -> str:
        """
        Store a new plan in the cache.

        Process:
        1. Extract template from goal
        2. Create embedding
        3. Parameterize plan steps (replace values with {PARAM} placeholders)
        4. Store in Redis with TTL

        Args:
            goal: User's original goal
            plan_steps: Generated plan steps
            ttl_seconds: Custom TTL (uses default if None)

        Returns:
            template_id: Hash of the template (for tracking)
        """
        if not self.redis:
            raise RuntimeError("Redis not initialized")

        # Extract template and parameters
        template_text, parameters = EntityExtractor.create_template(goal)

        # Generate template ID (deterministic hash)
        template_id = hashlib.sha256(template_text.encode()).hexdigest()[:16]

        # Check if template already exists
        exists = await self.redis.exists(f"{self.key_prefix}{template_id}")
        if exists:
            logger.info(f"Template already cached: {template_id}")
            return template_id

        # Embed template
        embedding = self.embedding_model.encode(template_text, convert_to_numpy=True)

        # TiDB PERSISTENCE HOOK (Phase 4)
        # Idempotent upsert of embedding vector if persistence is enabled
        try:
            tidb = get_tidb_store()
            if tidb.enabled:
                tidb.put_embedding(
                    embedding_id=template_id,
                    embedding=embedding.tolist(),
                    metadata={
                        "template_text": template_text,
                        "slots": list(parameters.keys()),
                        "created_at": self._iso_now(),
                    },
                )
        except Exception as e:
            # Fail-safe: don't block caching if persistence fails
            logger.warning(f"TiDB persistence failed (non-blocking): {e}")

        # Parameterize plan steps (reverse of injection)
        parameterized_steps = self._parameterize_steps(plan_steps, parameters)

        # Build plan template
        plan_template = PlanTemplate(
            template_id=template_id,
            template_text=template_text,
            parameter_slots=list(parameters.keys()),
            plan_steps=parameterized_steps,
            embedding=embedding.tolist(),
            hit_count=0,
            created_at=self._iso_now(),
            ttl_seconds=ttl_seconds or self.ttl_seconds,
        )

        # Store in Redis as hash
        await self.redis.hset(  # type: ignore[misc]
            f"{self.key_prefix}{template_id}",
            mapping={
                "template_id": plan_template.template_id,
                "template_text": plan_template.template_text,
                "plan_steps": json.dumps(plan_template.plan_steps),
                "embedding": embedding.astype(np.float32).tobytes(),
                "hit_count": 0,
                "created_at": plan_template.created_at,
            },
        )

        # Set TTL
        await self.redis.expire(f"{self.key_prefix}{template_id}", ttl_seconds or self.ttl_seconds)

        logger.info(f"Cached new template: {template_id} (TTL={ttl_seconds or self.ttl_seconds}s)")
        return template_id

    def _inject_parameters(
        self, plan_steps: list[dict[str, Any]], parameters: dict[str, str]
    ) -> list[dict[str, Any]]:
        """
        Replace {PARAM} placeholders with actual values.

        Example:
            steps = [{"action": "book_flight", "to": "{LOCATION}"}]
            params = {"LOCATION": "Paris"}
            → [{"action": "book_flight", "to": "Paris"}]
        """
        if not parameters:
            return plan_steps

        # Pre-compile regex from parameter keys for single-pass replacement
        pattern = re.compile("|".join(re.escape(f"{{{k}}}") for k in parameters))

        def _replace_func(match: re.Match[str]) -> str:
            # Extract key from {KEY}
            key = match.group(0)[1:-1]
            return parameters.get(key, match.group(0))

        injected = []
        for step in plan_steps:
            injected_step = {}
            for key, value in step.items():
                if isinstance(value, str):
                    value = pattern.sub(_replace_func, value)
                injected_step[key] = value
            injected.append(injected_step)
        return injected

    def _parameterize_steps(
        self, plan_steps: list[dict[str, Any]], parameters: dict[str, str]
    ) -> list[dict[str, Any]]:
        """
        Replace actual values with {PARAM} placeholders (inverse of injection).

        This converts a concrete plan into a reusable template.
        """
        if not parameters:
            return plan_steps

        # Invert parameters: value -> {key}
        # Sort values by length descending to match longest strings first
        # (prevents partial matches if one parameter value is a substring of another)
        sorted_params = sorted(
            [(k, v) for k, v in parameters.items() if v], key=lambda x: len(x[1]), reverse=True
        )

        if not sorted_params:
            return plan_steps

        # Mapping for replacement
        val_to_key = {v: f"{{{k}}}" for k, v in sorted_params}

        # Pre-compile regex from parameter values for single-pass replacement
        pattern = re.compile("|".join(re.escape(v) for _, v in sorted_params))

        def _replace_func(match: re.Match[str]) -> str:
            return val_to_key.get(match.group(0), match.group(0))

        parameterized = []
        for step in plan_steps:
            param_step = {}
            for key, value in step.items():
                if isinstance(value, str):
                    value = pattern.sub(_replace_func, value)
                param_step[key] = value
            parameterized.append(param_step)
        return parameterized

    @staticmethod
    def _generate_plan_id(_goal: str) -> str:
        """Generate unique plan instance ID."""
        import uuid
        from datetime import datetime, timezone

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        nonce = str(uuid.uuid4())[:8]
        return f"plan_{timestamp}_{nonce}"

    @staticmethod
    def _iso_now() -> str:
        """Get current time as ISO 8601 string."""
        from datetime import datetime, timezone

        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    async def close(self) -> None:
        """Close Redis connection."""
        if self.redis:
            # aclose() replaced close() in redis-py 5.0.1; CI's stubs lag the API.
            await self.redis.aclose()  # type: ignore[attr-defined]
            logger.info("Redis connection closed")
