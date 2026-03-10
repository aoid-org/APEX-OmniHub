import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import numpy as np
import json

from infrastructure.cache import EntityExtractor, SemanticCacheService, PlanTemplate, CachedPlan


def test_entity_extractor_extract_entities():
    # Test valid extractions
    text = "Book a flight to Paris tomorrow for $1,000.00"
    entities = EntityExtractor.extract_entities(text)

    # We use regex logic inside EntityExtractor
    # Make sure we got DATE, LOCATION, AMOUNT
    assert "tomorrow" in entities.get("DATE", [])
    assert "Paris" in entities.get("LOCATION", [])
    assert "$1,000.00" in entities.get("AMOUNT", [])


def test_entity_extractor_create_template():
    text = "Book flight to Paris tomorrow"
    template, params = EntityExtractor.create_template(text)

    assert "Paris" not in template
    assert "tomorrow" not in template
    assert "{LOCATION}" in template or "{LOCATION_0}" in template
    assert "{DATE}" in template or "{DATE_0}" in template

    # Check that parameters mapping is valid
    assert "Paris" in params.values()
    assert "tomorrow" in params.values()


@pytest.fixture
def mock_sentence_transformer():
    with patch("infrastructure.cache.SentenceTransformer") as mock_st:
        model_instance = MagicMock()
        model_instance.get_sentence_embedding_dimension.return_value = 384
        # Return a simple random vector for embedding
        model_instance.encode.return_value = np.zeros(384, dtype=np.float32)
        mock_st.return_value = model_instance
        yield model_instance


@pytest.fixture
def mock_redis():
    with patch("infrastructure.cache.aioredis.from_url") as mock_from_url:
        mock_redis_client = AsyncMock()
        mock_from_url.return_value = mock_redis_client
        yield mock_redis_client


@pytest.mark.asyncio
async def test_cache_initialize(mock_sentence_transformer, mock_redis):
    cache = SemanticCacheService("redis://mock")

    with patch.object(cache, "_create_index", new_callable=AsyncMock) as mock_create_index:
        await cache.initialize()
        mock_redis.assert_not_called()  # Actually from_url gets called via mock
        mock_create_index.assert_called_once()


@pytest.mark.asyncio
async def test_cache_create_index_exists(mock_sentence_transformer, mock_redis):
    cache = SemanticCacheService("redis://mock")
    cache.redis = mock_redis

    # Mock index info returning successfully (index exists)
    mock_redis.ft.return_value.info = AsyncMock()

    await cache._create_index()
    mock_redis.ft.return_value.create_index.assert_not_called()


@pytest.mark.asyncio
async def test_cache_create_index_not_exists(mock_sentence_transformer, mock_redis):
    cache = SemanticCacheService("redis://mock")
    cache.redis = mock_redis

    # Mock index info throwing exception (index doesn't exist)
    mock_redis.ft.return_value.info = AsyncMock(side_effect=Exception("Unknown Index name"))
    mock_redis.ft.return_value.create_index = AsyncMock()

    await cache._create_index()
    mock_redis.ft.return_value.create_index.assert_called_once()


@pytest.mark.asyncio
async def test_get_plan_cache_miss(mock_sentence_transformer, mock_redis):
    cache = SemanticCacheService("redis://mock")
    cache.redis = mock_redis

    # Mock search returning no docs
    mock_result = MagicMock()
    mock_result.docs = []
    mock_redis.ft.return_value.search = AsyncMock(return_value=mock_result)

    result = await cache.get_plan("Book flight to Tokyo")
    assert result is None


@pytest.mark.asyncio
async def test_get_plan_cache_hit_low_similarity(mock_sentence_transformer, mock_redis):
    cache = SemanticCacheService("redis://mock", similarity_threshold=0.85)
    cache.redis = mock_redis

    mock_result = MagicMock()
    mock_doc = MagicMock()
    # Distance is 1.0 - similarity. 1.0 - 0.5 = 0.5 < 0.85 (THRESHOLD)
    mock_doc.score = 0.5
    mock_result.docs = [mock_doc]
    mock_redis.ft.return_value.search = AsyncMock(return_value=mock_result)

    result = await cache.get_plan("Book flight to Tokyo")
    assert result is None


@pytest.mark.asyncio
async def test_get_plan_cache_hit_success(mock_sentence_transformer, mock_redis):
    cache = SemanticCacheService("redis://mock", similarity_threshold=0.85)
    cache.redis = mock_redis

    mock_result = MagicMock()
    mock_doc = MagicMock()
    mock_doc.score = 0.05  # Similarity = 0.95
    mock_doc.template_id = "tmpl-123"
    mock_result.docs = [mock_doc]
    mock_redis.ft.return_value.search = AsyncMock(return_value=mock_result)

    # Mock retrieving the plan steps
    plan_steps_json = json.dumps([{"action": "test", "val": "{LOCATION}"}])
    mock_redis.hget = AsyncMock(return_value=plan_steps_json)
    mock_redis.hincrby = AsyncMock()

    # Mock the entity extractor to yield some parameters
    with patch("infrastructure.cache.EntityExtractor.create_template") as mock_extract:
        mock_extract.return_value = ("Book flight to {LOCATION}", {"LOCATION": "Tokyo"})

        result = await cache.get_plan("Book flight to Tokyo")

        assert result is not None
        assert result.cache_hit is True
        assert result.similarity_score == 0.95
        assert result.steps[0]["val"] == "Tokyo"
        mock_redis.hincrby.assert_called_with("plan:tmpl-123", "hit_count", 1)


@pytest.mark.asyncio
async def test_store_plan_already_exists(mock_sentence_transformer, mock_redis):
    cache = SemanticCacheService("redis://mock")
    cache.redis = mock_redis

    mock_redis.exists = AsyncMock(return_value=True)

    template_id = await cache.store_plan("Book flight to Tokyo", [{"action": "test"}])
    assert template_id is not None
    mock_redis.hset.assert_not_called()


@pytest.mark.asyncio
async def test_store_plan_new(mock_sentence_transformer, mock_redis):
    cache = SemanticCacheService("redis://mock")
    cache.redis = mock_redis

    mock_redis.exists = AsyncMock(return_value=False)
    mock_redis.hset = AsyncMock()
    mock_redis.expire = AsyncMock()

    # Mock tidb persistence (failure shouldn't block)
    with patch("infrastructure.cache.get_tidb_store") as mock_get_tidb:
        mock_tidb = MagicMock()
        mock_tidb.enabled = True
        mock_tidb.put_embedding.side_effect = Exception("TiDB offline")
        mock_get_tidb.return_value = mock_tidb

        template_id = await cache.store_plan("Book flight to Tokyo", [{"action": "test"}])

        assert template_id is not None
        mock_redis.hset.assert_called_once()
        mock_redis.expire.assert_called_once()
