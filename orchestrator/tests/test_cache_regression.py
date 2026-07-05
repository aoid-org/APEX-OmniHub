import pytest
import redis.exceptions
from unittest.mock import AsyncMock, patch, MagicMock

from infrastructure.cache import SemanticCacheService


@pytest.mark.asyncio
async def test_cache_unsupported_ft_info():
    with (
        patch("infrastructure.cache.aioredis.from_url") as mock_from_url,
        patch("infrastructure.cache.validate_redis_search_compatibility"),
    ):
        mock_redis = AsyncMock()
        mock_from_url.return_value = mock_redis

        ft_mock = MagicMock()
        ft_mock.info = AsyncMock(
            side_effect=redis.exceptions.ResponseError("unknown command 'ft.info'")
        )
        mock_redis.ft.return_value = ft_mock

        cache = SemanticCacheService("redis://mock", "pass", False, "mock-model")
        cache.embedding_model = MagicMock()
        cache.embedding_model.get_sentence_embedding_dimension.return_value = 384

        await cache.initialize()

        assert not cache._search_supported
        # Should gracefully return None instead of calling redis.ft().search()
        assert await cache.get_plan("Book flight to Paris") is None
        # Should not raise exception
        await cache.store_plan("Book flight to Paris", [])


@pytest.mark.asyncio
async def test_cache_unsupported_ft_create():
    with (
        patch("infrastructure.cache.aioredis.from_url") as mock_from_url,
        patch("infrastructure.cache.validate_redis_search_compatibility"),
    ):
        mock_redis = AsyncMock()
        mock_from_url.return_value = mock_redis

        # Make info pass to let it reach create_index
        ft_mock = MagicMock()
        ft_mock.info = AsyncMock(side_effect=Exception("Index not found"))
        ft_mock.create_index = AsyncMock(
            side_effect=redis.exceptions.ResponseError("not available")
        )
        mock_redis.ft.return_value = ft_mock

        cache = SemanticCacheService("redis://mock", "pass", False, "mock-model")
        cache.embedding_model = MagicMock()
        cache.embedding_model.get_sentence_embedding_dimension.return_value = 384

        await cache.initialize()

        assert not cache._search_supported


@pytest.mark.asyncio
async def test_cache_store_plan_bypass():
    with (
        patch("infrastructure.cache.aioredis.from_url") as mock_from_url,
        patch("infrastructure.cache.validate_redis_search_compatibility"),
    ):
        mock_redis = AsyncMock()
        mock_from_url.return_value = mock_redis

        # Start without search support
        cache = SemanticCacheService("redis://mock", "pass", False, "mock-model")
        cache.embedding_model = MagicMock()
        cache.embedding_model.encode = MagicMock(return_value=MagicMock())
        cache.redis = mock_redis
        cache._search_supported = False

        await cache.store_plan("Book flight to Paris", [])

        # Verify redis.exists, hset, expire are not called
        mock_redis.exists.assert_not_called()
        mock_redis.hset.assert_not_called()
        mock_redis.expire.assert_not_called()
