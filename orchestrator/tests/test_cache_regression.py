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
        mock_redis = MagicMock()

        async def mock_from_url_coro(*_args, **_kwargs):
            return mock_redis

        mock_from_url.side_effect = mock_from_url_coro

        ft_mock = MagicMock()
        ft_mock.info = AsyncMock(
            side_effect=redis.exceptions.ResponseError("unknown command 'ft.info'")
        )
        mock_redis.ft.return_value = ft_mock

        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        cache = SemanticCacheService("redis://mock", "pass", False, mock_model)

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
        mock_redis = MagicMock()

        async def mock_from_url_coro(*_args, **_kwargs):
            return mock_redis

        mock_from_url.side_effect = mock_from_url_coro

        # Make info pass to let it reach create_index
        ft_mock = MagicMock()
        ft_mock.info = AsyncMock(side_effect=Exception("Index not found"))
        ft_mock.create_index = AsyncMock(
            side_effect=redis.exceptions.ResponseError("not available")
        )
        mock_redis.ft.return_value = ft_mock

        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        cache = SemanticCacheService("redis://mock", "pass", False, mock_model)

        await cache.initialize()

        assert not cache._search_supported


@pytest.mark.asyncio
async def test_cache_store_plan_bypass():
    with (
        patch("infrastructure.cache.aioredis.from_url") as mock_from_url,
        patch("infrastructure.cache.validate_redis_search_compatibility"),
    ):
        mock_redis = MagicMock()

        async def mock_from_url_coro(*_args, **_kwargs):
            return mock_redis

        mock_from_url.side_effect = mock_from_url_coro

        # Start without search support
        mock_model = MagicMock()
        mock_model.encode = MagicMock(return_value=MagicMock())
        cache = SemanticCacheService("redis://mock", "pass", False, mock_model)
        cache.redis = mock_redis
        cache._search_supported = False

        await cache.store_plan("Book flight to Paris", [])

        # Verify redis.exists, hset, expire are not called
        mock_redis.exists.assert_not_called()
        mock_redis.hset.assert_not_called()
        mock_redis.expire.assert_not_called()
