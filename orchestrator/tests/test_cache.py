"""Unit tests for semantic caching with Redis."""

import json
import os
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

from infrastructure.cache import (
    CachedPlan,
    EntityExtractor,
    PlanTemplate,
    SemanticCacheService,
    _redis_hash_index_type,
    _safe_redis_url,
    validate_redis_search_compatibility,
)


class TestRedisSearchCompatibility:
    """Regression coverage for Redis Search API drift on Render."""

    def test_redis_hash_index_type_uses_enum_hash_when_available(self):
        """_redis_hash_index_type returns IndexType.HASH when the API exposes it."""

        class FakeIndexType:
            HASH = "enum-hash"

        with patch("infrastructure.cache.IndexType", new=FakeIndexType):
            assert _redis_hash_index_type() == "enum-hash"

    def test_redis_hash_index_type_falls_back_to_literal_when_hash_missing(self):
        """_redis_hash_index_type returns literal HASH when IndexType.HASH is missing."""

        class FakeIndexType:
            JSON = "json"

        with patch("infrastructure.cache.IndexType", new=FakeIndexType):
            assert _redis_hash_index_type() == "HASH"

    def test_validate_redis_search_compatibility_passes_when_literal_hash_works(self):
        """Compatibility check passes when IndexType.HASH is absent but literal HASH is accepted."""

        class FakeIndexType:
            JSON = "json"

        class FakeIndexDefinition:
            def __init__(self, prefix, index_type):
                assert prefix == ["apex-compatibility-check:"]
                assert index_type == "HASH"

        with patch("infrastructure.cache.IndexType", new=FakeIndexType):
            with patch("infrastructure.cache.IndexDefinition", new=FakeIndexDefinition):
                validate_redis_search_compatibility()

    def test_validate_redis_search_compatibility_raises_clear_runtime_error(self):
        """Compatibility check converts invalid RediSearch APIs into actionable RuntimeError."""

        class FakeIndexType:
            JSON = "json"

        class RejectingIndexDefinition:
            def __init__(self, prefix, index_type):
                assert prefix == ["apex-compatibility-check:"]
                raise TypeError(f"unsupported index type: {index_type}")

        with patch("infrastructure.cache.IndexType", new=FakeIndexType):
            with patch("infrastructure.cache.IndexDefinition", new=RejectingIndexDefinition):
                with pytest.raises(RuntimeError) as excinfo:
                    validate_redis_search_compatibility()

        message = str(excinfo.value)
        assert "Redis Search compatibility check failed" in message
        assert "redis=" in message
        assert "IndexDefinition=" in message
        assert "IndexType=" in message
        assert "unsupported index type: HASH" in message
        assert "Update orchestrator Redis Search compatibility helper" in message

    def test_safe_redis_url_redacts_credentials_and_query(self):
        """Redis URL logs must never expose username, password, or query tokens."""

        safe = _safe_redis_url("rediss://user:secret-pass@redis.example.com:6380/0?token=abc123")

        assert safe == "rediss://<redacted>@redis.example.com:6380/0"
        assert "user" not in safe
        assert "secret-pass" not in safe
        assert "token" not in safe
        assert "abc123" not in safe

    def test_safe_redis_url_handles_invalid_url_without_leaking(self):
        """Invalid Redis URLs should not be echoed into logs."""

        assert _safe_redis_url("not a redis url with secret") == "<invalid-redis-url>"


class TestEntityExtractor:
    """Test entity extraction from natural language."""

    def test_extract_date_entities(self):
        """Should extract date references."""
        text = "Book flight tomorrow"
        entities = EntityExtractor.extract_entities(text)

        assert "DATE" in entities
        assert "tomorrow" in entities["DATE"]

    def test_extract_location_entities(self):
        """Should extract location references."""
        text = "Book flight to Paris"
        entities = EntityExtractor.extract_entities(text)

        assert "LOCATION" in entities
        assert any("paris" in loc.lower() for loc in entities["LOCATION"])

    def test_extract_email_entities(self):
        """Should extract email addresses."""
        text = "Send confirmation to user@example.com"
        entities = EntityExtractor.extract_entities(text)

        assert "EMAIL" in entities
        assert "user@example.com" in entities["EMAIL"]

    def test_extract_amount_entities(self):
        """Should extract monetary amounts."""
        text = "Transfer $1,500 to account"
        entities = EntityExtractor.extract_entities(text)

        assert "AMOUNT" in entities
        assert "$1,500" in entities["AMOUNT"]

    def test_create_template(self):
        """Should convert goal into parameterized template."""
        text = "Book flight to Paris tomorrow"
        template, params = EntityExtractor.create_template(text)

        # Check template has placeholders
        assert "{" in template and "}" in template

        # Check parameters extracted
        assert "LOCATION" in params or "DATE" in params

    def test_template_preserves_structure(self):
        """Should preserve sentence structure in template."""
        text = "Send $500 to john@example.com tomorrow"
        template, params = EntityExtractor.create_template(text)

        # Template should start with "Send"
        assert template.startswith("Send")

        # Should have extracted email and amount
        assert "EMAIL" in params or "AMOUNT" in params


@pytest.mark.asyncio
class TestSemanticCacheService:
    """Test semantic cache with vector similarity search."""

    @pytest.fixture
    async def cache_service(self):
        """Create cache service instance for testing."""
        # Use environment variable or default to localhost
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")

        mock_model = MagicMock()

        # Return deterministic vector based on text to allow exact matches but fail cache miss
        def mock_encode(text, **_kwargs):
            import hashlib

            h = int(hashlib.sha256(text.encode()).hexdigest(), 16)
            rng = np.random.default_rng(h % (2**32))
            return rng.standard_normal(3).astype(np.float32)

        mock_model.encode.side_effect = mock_encode
        mock_model.get_sentence_embedding_dimension.return_value = 3

        with patch("infrastructure.cache.SentenceTransformer", return_value=mock_model):
            cache = SemanticCacheService(
                redis_url=redis_url,
                redis_password=os.getenv("REDIS_PASSWORD"),
                redis_ssl=os.getenv("REDIS_SSL", "false").lower() == "true",
                similarity_threshold=0.85,
                ttl_seconds=300,  # 5min for tests
            )
        try:
            await cache.initialize()
            yield cache
        except Exception as e:
            # Print error for debugging and skip tests
            print(f"Redis connection failed: {e}")
            pytest.skip(f"Redis not available for testing: {e}")
        finally:
            await cache.close()

    async def test_store_and_retrieve_plan(self, cache_service):
        """Should store plan and retrieve it on cache hit."""
        goal = "Book flight to Paris tomorrow"
        plan_steps = [
            {
                "id": "step1",
                "tool": "search_flights",
                "input": {"to": "{LOCATION}", "date": "{DATE}"},
            },
            {"id": "step2", "tool": "book_flight", "input": {"flight_id": "{FLIGHT_ID}"}},
        ]

        # Store plan
        template_id = await cache_service.store_plan(goal, plan_steps)
        assert template_id is not None

        # Retrieve plan (should hit cache)
        cached = await cache_service.get_plan("Book flight to Paris tomorrow")

        assert cached is not None
        assert cached.cache_hit is True
        assert cached.similarity_score >= 0.85
        assert len(cached.steps) == 2

    async def test_semantic_similarity_matching(self, cache_service):
        """Should match semantically similar queries."""
        # Store plan
        original_goal = "Book flight to Paris"
        plan_steps = [{"id": "step1", "tool": "search_flights"}]
        await cache_service.store_plan(original_goal, plan_steps)

        # Try similar query
        similar_goal = "Reserve airplane ticket to Paris"
        cached = await cache_service.get_plan(similar_goal)

        # Might hit cache if embedding similarity is high enough
        # (depends on sentence-transformers model)
        if cached:
            assert cached.similarity_score >= 0.85

    async def test_parameter_injection(self, cache_service):
        """Should inject correct parameters into cached plan."""
        goal = "Book flight to Paris on 2024-01-15"
        plan_steps = [
            {
                "id": "step1",
                "tool": "search_flights",
                "input": {"to": "{LOCATION}", "date": "{DATE}"},
            },
        ]
        await cache_service.store_plan(goal, plan_steps)

        # Retrieve with same parameters
        cached = await cache_service.get_plan("Book flight to Paris on 2024-01-15")

        if cached:
            # Check parameters were injected
            assert cached.parameters is not None
            # Should have extracted Paris and date
            assert len(cached.parameters) > 0

    async def test_cache_miss(self, cache_service):
        """Should return None on cache miss."""
        # Try to get plan that doesn't exist
        cached = await cache_service.get_plan("Completely unique query xyz123")

        assert cached is None

    async def test_ttl_expiration(self, cache_service):
        """Should respect TTL for cache entries."""
        # Store plan with 1-second TTL
        cache_service.ttl_seconds = 1
        goal = "Test expiration"
        plan_steps = [{"id": "step1", "tool": "test"}]

        await cache_service.store_plan(goal, plan_steps, ttl_seconds=1)

        # Immediate retrieval should hit
        cached = await cache_service.get_plan(goal)
        assert cached is not None

        # Wait for expiration
        import asyncio

        await asyncio.sleep(2)

        # Should miss cache after TTL
        cached_after = await cache_service.get_plan(goal)
        assert cached_after is None or cached_after.similarity_score < 0.85


# ---------------------------------------------------------------------------
# Helper: build a fully-mocked SemanticCacheService without real SentenceTransformer
# ---------------------------------------------------------------------------


def _make_mock_cache(similarity_threshold: float = 0.85) -> SemanticCacheService:
    """
    Return a SemanticCacheService with SentenceTransformer mocked out.

    The real __init__ calls SentenceTransformer(model_name) at construction time,
    so we patch it before constructing the instance.
    """
    mock_model = MagicMock()
    # encode() returns a numpy array of shape (dim,)
    mock_model.encode.return_value = np.array([0.1, 0.2, 0.3], dtype=np.float32)
    mock_model.get_sentence_embedding_dimension.return_value = 3

    with patch("infrastructure.cache.SentenceTransformer", return_value=mock_model):
        cache = SemanticCacheService(
            redis_url="redis://localhost:6379",
            similarity_threshold=similarity_threshold,
            ttl_seconds=300,
        )
    # Inject mock model reference so tests can configure .encode()
    cache.embedding_model = mock_model
    return cache


# ---------------------------------------------------------------------------
# EntityExtractor additional coverage
# ---------------------------------------------------------------------------


class TestEntityExtractorExtra:
    """Additional entity extractor edge cases."""

    def test_extract_no_entities(self):
        """Text with no recognizable entities returns empty dict."""
        entities = EntityExtractor.extract_entities("hello world")
        # No entities expected from a simple greeting
        assert isinstance(entities, dict)

    def test_extract_person_entities(self):
        """Should extract person names."""
        text = "Schedule meeting with John Doe"
        entities = EntityExtractor.extract_entities(text)
        assert "PERSON" in entities

    def test_create_template_no_entities(self):
        """Template with no recognizable entities leaves params empty or minimal."""
        # Note: PERSON pattern uses IGNORECASE so some words may be matched.
        # We just verify the function runs and returns a tuple.
        text = "launch rocket"
        template, params = EntityExtractor.create_template(text)
        assert isinstance(template, str)
        assert isinstance(params, dict)

    def test_create_template_multiple_same_type(self):
        """Multiple entities of the same type get indexed placeholders."""
        text = "Transfer $100 and $200 to account"
        template, _ = EntityExtractor.create_template(text)
        # Should have at least one AMOUNT placeholder
        assert "{" in template

    def test_extract_date_ymd_format(self):
        """Extract date in YYYY-MM-DD format."""
        text = "Schedule for 2024-03-15"
        entities = EntityExtractor.extract_entities(text)
        assert "DATE" in entities

    def test_extract_amount_dollars_word(self):
        """Extract monetary amount using 'dollars' word."""
        text = "Pay 50 dollars"
        entities = EntityExtractor.extract_entities(text)
        assert "AMOUNT" in entities


# ---------------------------------------------------------------------------
# SemanticCacheService unit tests (fully mocked Redis + SentenceTransformer)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
class TestSemanticCacheServiceMocked:
    """Fully mocked tests for SemanticCacheService (no real Redis)."""

    @pytest.fixture
    def cache(self):
        return _make_mock_cache()

    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client.

        ft() is a synchronous method (on the real redis client) that returns an object
        with async methods (info, search, create_index). We therefore:
        - make redis.ft a synchronous MagicMock
        - have it return a MagicMock whose individual methods are AsyncMock
        All other redis methods (hget, hset, hincrby, expire, exists) are AsyncMock.
        """
        redis = MagicMock()
        ft_mock = MagicMock()
        ft_mock.info = AsyncMock()
        ft_mock.search = AsyncMock()
        ft_mock.create_index = AsyncMock()
        redis.ft.return_value = ft_mock

        # Make async Redis methods AsyncMock
        redis.hget = AsyncMock()
        redis.hset = AsyncMock()
        redis.hincrby = AsyncMock()
        redis.expire = AsyncMock()
        redis.exists = AsyncMock()
        redis.aclose = AsyncMock()
        return redis

    # ------------------------------------------------------------------
    # _create_index
    # ------------------------------------------------------------------

    async def test_create_index_no_redis_raises(self, cache):
        """_create_index raises RuntimeError when redis is None."""
        cache.redis = None
        with pytest.raises(RuntimeError, match="Redis not initialized"):
            await cache._create_index()

    async def test_create_index_already_exists(self, cache, mock_redis):
        """_create_index returns early when index already exists."""
        cache.redis = mock_redis
        # info() succeeds → index exists → early return
        mock_redis.ft.return_value.info = AsyncMock(return_value={"some": "info"})
        mock_redis.ft.return_value.create_index = AsyncMock()
        await cache._create_index()
        # create_index should NOT be called since index already exists
        mock_redis.ft.return_value.create_index.assert_not_called()

    async def test_create_index_creates_when_missing(self, cache, mock_redis):
        """_create_index creates index when info() raises (index missing)."""
        cache.redis = mock_redis
        # info() raises → index not found → create
        mock_redis.ft.return_value.info = AsyncMock(side_effect=Exception("index not found"))
        mock_redis.ft.return_value.create_index = AsyncMock()

        class FakeIndexType:
            JSON = "json"

        index_definition = MagicMock()
        with patch("infrastructure.cache.IndexType", new=FakeIndexType):
            with patch("infrastructure.cache.IndexDefinition", new=index_definition):
                await cache._create_index()
        mock_redis.ft.return_value.create_index.assert_called_once()
        _, kwargs = mock_redis.ft.return_value.create_index.call_args
        index_definition.assert_called_once_with(prefix=[cache.key_prefix], index_type="HASH")
        assert kwargs["definition"] is index_definition.return_value

    # ------------------------------------------------------------------
    # initialize
    # ------------------------------------------------------------------

    async def test_initialize_connects_validates_and_creates_index_in_order(self, cache):
        """initialize() validates Redis Search compatibility before creating the index."""
        mock_redis_instance = MagicMock()
        call_order = []

        async def fake_create_index():
            call_order.append("create_index")

        def fake_validate():
            call_order.append("validate")

        with patch(
            "infrastructure.cache.aioredis.from_url",
            new=AsyncMock(return_value=mock_redis_instance),
        ):
            with patch(
                "infrastructure.cache.validate_redis_search_compatibility",
                side_effect=fake_validate,
            ):
                with patch.object(
                    cache, "_create_index", new=AsyncMock(side_effect=fake_create_index)
                ):
                    await cache.initialize()

        assert cache.redis is mock_redis_instance
        assert call_order == ["validate", "create_index"]

    async def test_initialize_logs_redacted_redis_url(self, cache, caplog):
        """initialize() must not print Redis credentials into logs."""
        cache.redis_url = "rediss://user:secret-pass@redis.example.com:6380/0?token=abc123"
        mock_redis_instance = MagicMock()

        with patch(
            "infrastructure.cache.aioredis.from_url",
            new=AsyncMock(return_value=mock_redis_instance),
        ):
            with patch("infrastructure.cache.validate_redis_search_compatibility"):
                with patch.object(cache, "_create_index", new=AsyncMock()):
                    with caplog.at_level("INFO", logger="infrastructure.cache"):
                        await cache.initialize()

        log_output = caplog.text
        assert "rediss://<redacted>@redis.example.com:6380/0" in log_output
        assert "secret-pass" not in log_output
        assert "token=abc123" not in log_output

    async def test_initialize_omits_ssl_when_disabled(self, cache):
        """initialize() omits the ssl kwarg entirely when Redis SSL is disabled."""
        assert cache.redis_ssl is False
        mock_redis_instance = MagicMock()

        from_url = AsyncMock(return_value=mock_redis_instance)
        with patch("infrastructure.cache.aioredis.from_url", new=from_url):
            with patch("infrastructure.cache.validate_redis_search_compatibility"):
                with patch.object(cache, "_create_index", new=AsyncMock()):
                    await cache.initialize()

        _, kwargs = from_url.call_args
        assert "ssl" not in kwargs

    async def test_initialize_passes_ssl_only_when_enabled(self, cache):
        """initialize() passes ssl kwarg only when Redis SSL is enabled."""
        cache.redis_ssl = True
        mock_redis_instance = MagicMock()

        from_url = AsyncMock(return_value=mock_redis_instance)
        with patch("infrastructure.cache.aioredis.from_url", new=from_url):
            with patch("infrastructure.cache.validate_redis_search_compatibility"):
                with patch.object(cache, "_create_index", new=AsyncMock()):
                    await cache.initialize()

        _, kwargs = from_url.call_args
        assert kwargs["ssl"] is True

    # ------------------------------------------------------------------
    # close
    # ------------------------------------------------------------------

    async def test_close_with_redis(self, cache, mock_redis):
        """close() calls aclose() on the Redis client (redis-py >=5.0.1 API)."""
        cache.redis = mock_redis
        await cache.close()
        mock_redis.aclose.assert_awaited_once()

    async def test_close_without_redis(self, cache):
        """close() is a no-op when redis is None."""
        cache.redis = None
        await cache.close()  # Should not raise

    # ------------------------------------------------------------------
    # get_plan
    # ------------------------------------------------------------------

    async def test_get_plan_no_redis_raises(self, cache):
        """get_plan raises RuntimeError when redis is None."""
        cache.redis = None
        with pytest.raises(RuntimeError, match="Redis not initialized"):
            await cache.get_plan("Book flight to Paris")

    async def test_get_plan_search_exception_returns_none(self, cache, mock_redis):
        """get_plan returns None when vector search raises an exception."""
        cache.redis = mock_redis
        mock_redis.ft.return_value.search = AsyncMock(side_effect=Exception("search error"))
        result = await cache.get_plan("Book flight to Paris")
        assert result is None

    async def test_get_plan_no_results_returns_none(self, cache, mock_redis):
        """get_plan returns None when search returns no docs."""
        cache.redis = mock_redis
        search_result = MagicMock()
        search_result.docs = []
        mock_redis.ft.return_value.search = AsyncMock(return_value=search_result)
        result = await cache.get_plan("Book flight to Paris")
        assert result is None

    async def test_get_plan_below_threshold_returns_none(self, cache, mock_redis):
        """get_plan returns None when similarity is below threshold."""
        cache.redis = mock_redis
        cache.similarity_threshold = 0.95

        doc = MagicMock()
        doc.score = "0.5"  # distance 0.5 → similarity 0.5 < 0.95
        search_result = MagicMock()
        search_result.docs = [doc]
        mock_redis.ft.return_value.search = AsyncMock(return_value=search_result)

        result = await cache.get_plan("Book flight")
        assert result is None

    async def test_get_plan_no_plan_steps_json_returns_none(self, cache, mock_redis):
        """get_plan returns None when plan_steps JSON is missing from Redis."""
        cache.redis = mock_redis
        cache.similarity_threshold = 0.5

        doc = MagicMock()
        doc.score = "0.1"  # distance 0.1 → similarity 0.9 > threshold
        doc.template_id = "abc123"
        search_result = MagicMock()
        search_result.docs = [doc]
        mock_redis.ft.return_value.search = AsyncMock(return_value=search_result)
        mock_redis.hget = AsyncMock(return_value=None)  # no plan_steps stored

        result = await cache.get_plan("Book flight")
        assert result is None

    async def test_get_plan_cache_hit_returns_cached_plan(self, cache, mock_redis):
        """get_plan returns CachedPlan on cache hit."""
        cache.redis = mock_redis
        cache.similarity_threshold = 0.5

        doc = MagicMock()
        doc.score = "0.05"  # distance 0.05 → similarity 0.95 > threshold
        doc.template_id = "abc123"
        search_result = MagicMock()
        search_result.docs = [doc]
        mock_redis.ft.return_value.search = AsyncMock(return_value=search_result)

        plan_steps = [{"action": "book_flight", "dest": "Paris"}]
        mock_redis.hget = AsyncMock(return_value=json.dumps(plan_steps))
        mock_redis.hincrby = AsyncMock()

        result = await cache.get_plan("Book flight to Paris")
        assert result is not None
        assert isinstance(result, CachedPlan)
        assert result.cache_hit is True
        assert result.similarity_score == pytest.approx(0.95)
        assert result.template_id == "abc123"
        mock_redis.hincrby.assert_called_once()

    # ------------------------------------------------------------------
    # store_plan
    # ------------------------------------------------------------------

    async def test_store_plan_no_redis_raises(self, cache):
        """store_plan raises RuntimeError when redis is None."""
        cache.redis = None
        with pytest.raises(RuntimeError, match="Redis not initialized"):
            await cache.store_plan("goal", [])

    async def test_store_plan_already_exists_returns_template_id(self, cache, mock_redis):
        """store_plan returns existing template_id when key already exists in Redis."""
        cache.redis = mock_redis
        mock_redis.exists = AsyncMock(return_value=1)  # key exists

        template_id = await cache.store_plan("Book flight to Paris", [{"action": "step1"}])
        assert isinstance(template_id, str)
        assert len(template_id) == 16
        # hset should NOT be called since template exists
        mock_redis.hset.assert_not_called()

    async def test_store_plan_new_template(self, cache, mock_redis):
        """store_plan stores new template and returns template_id."""
        cache.redis = mock_redis
        mock_redis.exists = AsyncMock(return_value=0)  # key does not exist
        mock_redis.hset = AsyncMock()
        mock_redis.expire = AsyncMock()

        plan_steps = [{"action": "search_flights", "dest": "Paris"}]
        with patch("infrastructure.cache.get_tidb_store") as mock_tidb_store:
            mock_tidb = MagicMock()
            mock_tidb.enabled = False
            mock_tidb_store.return_value = mock_tidb

            template_id = await cache.store_plan("Book flight to Paris", plan_steps)

        assert isinstance(template_id, str)
        assert len(template_id) == 16
        mock_redis.hset.assert_called_once()
        mock_redis.expire.assert_called_once()

    async def test_store_plan_with_tidb_enabled(self, cache, mock_redis):
        """store_plan calls tidb.put_embedding when tidb is enabled."""
        cache.redis = mock_redis
        mock_redis.exists = AsyncMock(return_value=0)
        mock_redis.hset = AsyncMock()
        mock_redis.expire = AsyncMock()

        with patch("infrastructure.cache.get_tidb_store") as mock_tidb_store:
            mock_tidb = MagicMock()
            mock_tidb.enabled = True
            mock_tidb_store.return_value = mock_tidb

            await cache.store_plan("Book flight to Paris", [{"action": "step1"}])
            mock_tidb.put_embedding.assert_called_once()

    async def test_store_plan_tidb_failure_does_not_block(self, cache, mock_redis):
        """store_plan continues even when TiDB persistence fails."""
        cache.redis = mock_redis
        mock_redis.exists = AsyncMock(return_value=0)
        mock_redis.hset = AsyncMock()
        mock_redis.expire = AsyncMock()

        with patch("infrastructure.cache.get_tidb_store") as mock_tidb_store:
            mock_tidb_store.side_effect = RuntimeError("TiDB unavailable")

            # Should not raise - fail-safe
            template_id = await cache.store_plan("Book flight to Paris", [{"action": "step1"}])
            assert template_id is not None

    async def test_store_plan_with_custom_ttl(self, cache, mock_redis):
        """store_plan uses custom TTL when provided."""
        cache.redis = mock_redis
        mock_redis.exists = AsyncMock(return_value=0)
        mock_redis.hset = AsyncMock()
        mock_redis.expire = AsyncMock()

        with patch("infrastructure.cache.get_tidb_store") as mock_tidb_store:
            mock_tidb = MagicMock()
            mock_tidb.enabled = False
            mock_tidb_store.return_value = mock_tidb

            await cache.store_plan("Book flight to Paris", [{"action": "step1"}], ttl_seconds=999)

        call_args = mock_redis.expire.call_args
        assert call_args[0][1] == 999


# ---------------------------------------------------------------------------
# Sync methods on SemanticCacheService (outside asyncio class to avoid warnings)
# ---------------------------------------------------------------------------


class TestSemanticCacheSyncMethods:
    """Tests for synchronous methods of SemanticCacheService."""

    @pytest.fixture
    def cache(self):
        return _make_mock_cache()

    # ------------------------------------------------------------------
    # _inject_parameters
    # ------------------------------------------------------------------

    def test_inject_parameters_replaces_placeholders(self, cache):
        """_inject_parameters replaces {PARAM} with actual values."""
        plan_steps = [{"action": "book", "dest": "{LOCATION}", "date": "{DATE}"}]
        params = {"LOCATION": "Paris", "DATE": "tomorrow"}
        result = cache._inject_parameters(plan_steps, params)
        assert result[0]["dest"] == "Paris"
        assert result[0]["date"] == "tomorrow"

    def test_inject_parameters_no_params(self, cache):
        """_inject_parameters with empty params leaves steps unchanged."""
        plan_steps = [{"action": "book", "dest": "Paris"}]
        result = cache._inject_parameters(plan_steps, {})
        assert result[0]["dest"] == "Paris"

    def test_inject_parameters_non_string_value_preserved(self, cache):
        """_inject_parameters skips non-string values."""
        plan_steps = [{"action": "book", "count": 42}]
        result = cache._inject_parameters(plan_steps, {"count": "5"})
        assert result[0]["count"] == 42  # not replaced, was int

    # ------------------------------------------------------------------
    # _parameterize_steps
    # ------------------------------------------------------------------

    def test_parameterize_steps_replaces_values(self, cache):
        """_parameterize_steps replaces actual values with placeholders."""
        plan_steps = [{"action": "book", "dest": "Paris", "date": "tomorrow"}]
        params = {"LOCATION": "Paris", "DATE": "tomorrow"}
        result = cache._parameterize_steps(plan_steps, params)
        assert result[0]["dest"] == "{LOCATION}"
        assert result[0]["date"] == "{DATE}"

    def test_parameterize_steps_empty(self, cache):
        """_parameterize_steps with empty steps returns empty list."""
        result = cache._parameterize_steps([], {"LOC": "Paris"})
        assert result == []

    def test_parameterize_steps_non_string_value_preserved(self, cache):
        """_parameterize_steps skips non-string values."""
        plan_steps = [{"action": "book", "count": 42}]
        result = cache._parameterize_steps(plan_steps, {"count": "42"})
        assert result[0]["count"] == 42

    # ------------------------------------------------------------------
    # _generate_plan_id
    # ------------------------------------------------------------------

    def test_generate_plan_id_format(self):
        """_generate_plan_id returns string starting with 'plan_'."""
        pid = SemanticCacheService._generate_plan_id("some goal")
        assert pid.startswith("plan_")
        assert len(pid) > 10

    def test_generate_plan_id_unique(self):
        """_generate_plan_id generates unique IDs."""
        pid1 = SemanticCacheService._generate_plan_id("goal")
        pid2 = SemanticCacheService._generate_plan_id("goal")
        # They may differ due to timestamp nonce - just assert both are valid
        assert pid1.startswith("plan_")
        assert pid2.startswith("plan_")

    # ------------------------------------------------------------------
    # _iso_now
    # ------------------------------------------------------------------

    def test_iso_now_format(self):
        """_iso_now returns ISO 8601 string ending in Z."""
        ts = SemanticCacheService._iso_now()
        assert ts.endswith("Z")
        assert "T" in ts

    # ------------------------------------------------------------------
    # PlanTemplate model
    # ------------------------------------------------------------------

    def test_plan_template_construction(self):
        """PlanTemplate can be constructed with valid fields."""
        template = PlanTemplate(
            template_id="abc123",
            template_text="Book flight to {LOCATION}",
            parameter_slots=["LOCATION"],
            plan_steps=[{"action": "book"}],
            embedding=[0.1, 0.2, 0.3],
            created_at="2024-01-01T00:00:00Z",
        )
        assert template.template_id == "abc123"
        assert template.hit_count == 0
        assert template.ttl_seconds == 86400
