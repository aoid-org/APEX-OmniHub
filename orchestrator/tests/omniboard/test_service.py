"""
Tests for OmniBoardService fuzzy provider matching.

Security: Tests verify empty input returns [] to prevent information disclosure.
Performance: Tests verify <100ms response time for typical queries.
"""
import time
from unittest.mock import AsyncMock, patch

import pytest

from omniboard.service import OmniBoardService


DEFAULT_PROVIDERS = OmniBoardService.KNOWN_PROVIDERS


def _mock_get_known_providers(providers=None):
    """Return an async mock that yields the given providers list."""
    if providers is None:
        providers = list(DEFAULT_PROVIDERS)
    return AsyncMock(return_value=providers)


class TestFuzzyMatchProvider:
    """Core fuzzy matching behavior."""

    @pytest.fixture
    def service(self):
        """Fresh service instance for each test."""
        return OmniBoardService()

    @pytest.mark.asyncio
    async def test_exact_match(self, service):
        """Exact provider name returns single match."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider("Gmail")
        assert result == ["Gmail"]

    @pytest.mark.asyncio
    async def test_case_insensitive(self, service):
        """Case variations match correctly."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            r1 = await service.fuzzy_match_provider("gmail")
            r2 = await service.fuzzy_match_provider("GMAIL")
            r3 = await service.fuzzy_match_provider("GmAiL")
        assert r1 == ["Gmail"]
        assert r2 == ["Gmail"]
        assert r3 == ["Gmail"]

    @pytest.mark.asyncio
    async def test_substring_match(self, service):
        """Partial strings match all containing providers."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider("Hub")
        assert "GitHub" in result
        assert "HubSpot" in result
        assert result.index("HubSpot") < result.index("GitHub")

    @pytest.mark.asyncio
    async def test_reverse_substring(self, service):
        """Provider name as substring of query."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider("Gmail Login Page")
        assert "Gmail" in result

    @pytest.mark.asyncio
    async def test_no_match(self, service):
        """Non-existent provider returns empty list."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider("Zoom")
        assert result == []

    @pytest.mark.asyncio
    async def test_empty_input_returns_empty(self, service):
        """Empty/whitespace queries return [] for security."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            r1 = await service.fuzzy_match_provider("")
            r2 = await service.fuzzy_match_provider(" ")
            r3 = await service.fuzzy_match_provider("\t\n")
        assert r1 == []
        assert r2 == []
        assert r3 == []


class TestFuzzyMatchProviderEdgeCases:
    """Edge cases and security boundaries."""

    @pytest.fixture
    def service(self):
        return OmniBoardService()

    @pytest.mark.asyncio
    async def test_special_characters_sanitized(self, service):
        """Special chars don't break matching."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider("Gmail;DROP TABLE--")
        assert "Gmail" in result

    @pytest.mark.asyncio
    async def test_unicode_handling(self, service):
        """Unicode characters handled gracefully."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider("Gm\u00e1il")
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_very_long_query(self, service):
        """Extremely long queries don't cause performance issues."""
        long_query = "A" * 10000
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider(long_query)
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_multiple_matches_sorted_by_relevance(self, service):
        """Multiple matches return best-first."""
        custom_providers = ["SlackBot", "Slack", "SlackConnect"]
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers(custom_providers)):
            result = await service.fuzzy_match_provider("Slack")
        assert result[0] == "Slack"
        assert "SlackBot" in result
        assert "SlackConnect" in result
        assert result.index("SlackBot") < result.index("SlackConnect")

    @pytest.mark.asyncio
    async def test_single_character_query(self, service):
        """Single char queries work (performance consideration)."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider("G")
        assert isinstance(result, list)
        assert "Gmail" in result
        assert "GitHub" in result

    @pytest.mark.asyncio
    async def test_numeric_query(self, service):
        """Numeric strings handled correctly."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider("123")
        assert isinstance(result, list)
        assert result == []

    @pytest.mark.asyncio
    async def test_duplicate_results_removed(self, service):
        """No duplicate providers in results."""
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            result = await service.fuzzy_match_provider("Git")
        assert len(result) == len(set(result))


class TestFuzzyMatchProviderPerformance:
    """Performance and scalability tests."""

    @pytest.mark.asyncio
    async def test_response_time_under_100ms(self):
        """Typical queries complete quickly."""
        service = OmniBoardService()
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            start = time.perf_counter()
            await service.fuzzy_match_provider("Git")
            duration = (time.perf_counter() - start) * 1000
        assert duration < 100, f"Query took {duration:.2f}ms (limit: 100ms)"

    @pytest.mark.asyncio
    async def test_handles_concurrent_queries(self):
        """Async-safe for concurrent requests."""
        import asyncio

        service = OmniBoardService()
        with patch.object(OmniBoardService, "get_known_providers", _mock_get_known_providers()):
            tasks = [service.fuzzy_match_provider("Slack") for _ in range(10)]
            results = await asyncio.gather(*tasks)
        first_result = results[0]
        assert all(r == first_result for r in results)
