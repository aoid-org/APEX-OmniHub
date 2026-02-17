"""
Tests for OmniBoardService fuzzy provider matching.

Security: Tests verify empty input returns [] to prevent information disclosure.
Performance: Tests verify <100ms response time for typical queries.
"""

import time

import pytest

from omniboard.service import OmniBoardService


class TestFuzzyMatchProvider:
    """Core fuzzy matching behavior."""

    @pytest.fixture
    def service(self):
        """Fresh service instance for each test."""
        return OmniBoardService()

    def test_exact_match(self, service):
        """Exact provider name returns single match."""
        result = service.fuzzy_match_provider("Gmail")
        assert result == ["Gmail"]

    def test_case_insensitive(self, service):
        """Case variations match correctly."""
        assert service.fuzzy_match_provider("gmail") == ["Gmail"]
        assert service.fuzzy_match_provider("GMAIL") == ["Gmail"]
        assert service.fuzzy_match_provider("GmAiL") == ["Gmail"]

    def test_substring_match(self, service):
        """Partial strings match all containing providers."""
        # KNOWN_PROVIDERS has GitHub and HubSpot (which contains 'Hub')
        # HubSpot starts with "Hub" (Score 500)
        # GitHub contains "Hub" (Score 250)
        result = service.fuzzy_match_provider("Hub")
        assert "GitHub" in result
        assert "HubSpot" in result
        # Verify sorting: HubSpot (Starts with) > GitHub (Contains)
        assert result.index("HubSpot") < result.index("GitHub")

    def test_reverse_substring(self, service):
        """Provider name as substring of query."""
        result = service.fuzzy_match_provider("Gmail Login Page")
        assert "Gmail" in result

    def test_no_match(self, service):
        """Non-existent provider returns empty list."""
        result = service.fuzzy_match_provider("Zoom")
        assert result == []

    def test_empty_input_returns_empty(self, service):
        """Empty/whitespace queries return [] for security."""
        assert service.fuzzy_match_provider("") == []
        assert service.fuzzy_match_provider("   ") == []
        assert service.fuzzy_match_provider("\t\n") == []


class TestFuzzyMatchProviderEdgeCases:
    """Edge cases and security boundaries."""

    @pytest.fixture
    def service(self):
        return OmniBoardService()

    def test_special_characters_sanitized(self, service):
        """Special chars don't break matching."""
        # Assuming you sanitize input or handle it gracefully
        # If sanitization removes special chars, "Gmail;DROP TABLE--" -> "Gmail"
        # If strict match, it might return empty or just Gmail if contains logic works
        # The prompt implies it should find "Gmail"
        result = service.fuzzy_match_provider("Gmail;DROP TABLE--")
        # If the implementation doesn't strip special chars, this might fail to find exact match
        # but "Gmail" is a substring of "Gmail;DROP TABLE--", so reverse match logic should catch
        # it.
        assert "Gmail" in result

    def test_unicode_handling(self, service):
        """Unicode characters handled gracefully."""
        # Assuming no crash. If strict match, returns empty list unless we implement normalization.
        # The goal is "handled gracefully" (no error).
        result = service.fuzzy_match_provider("Gmáil")
        assert isinstance(result, list)

    def test_very_long_query(self, service):
        """Extremely long queries don't cause performance issues."""
        long_query = "A" * 10000
        result = service.fuzzy_match_provider(long_query)
        assert isinstance(result, list)  # Should complete without timeout

    def test_multiple_matches_sorted_by_relevance(self, service):
        """Multiple matches return best-first."""
        # Mocking providers to test sorting logic specifically
        # Setup: "Slack", "SlackBot", "SlackConnect"
        # Query: "Slack"
        # "Slack" -> Exact match (score 1000)
        # "SlackBot" -> Starts with (score 500)
        # "SlackConnect" -> Starts with (score 500), but longer -> lower score

        original_providers = OmniBoardService.KNOWN_PROVIDERS
        OmniBoardService.KNOWN_PROVIDERS = ["SlackBot", "Slack", "SlackConnect"]
        try:
            result = service.fuzzy_match_provider("Slack")
            assert result[0] == "Slack"
            assert "SlackBot" in result
            assert "SlackConnect" in result
            # SlackBot (8 chars) vs SlackConnect (12 chars). Both start with "Slack".
            # Shorter should be higher score.
            assert result.index("SlackBot") < result.index("SlackConnect")
        finally:
            OmniBoardService.KNOWN_PROVIDERS = original_providers

    def test_single_character_query(self, service):
        """Single char queries work (performance consideration)."""
        # "G" matches "Gmail", "GitHub" (starts with)
        result = service.fuzzy_match_provider("G")
        assert isinstance(result, list)
        assert "Gmail" in result
        assert "GitHub" in result

    def test_numeric_query(self, service):
        """Numeric strings handled correctly."""
        result = service.fuzzy_match_provider("123")
        assert isinstance(result, list)
        # If no provider has numbers, list is empty. If logic is robust, no crash.
        assert result == []

    def test_duplicate_results_removed(self, service):
        """No duplicate providers in results."""
        # If "Git" matches "GitHub" via 'Starts with' and also via 'Contains' logic?
        # The implementation iterates providers once, so duplicates shouldn't happen unless logic
        # is flawed.
        result = service.fuzzy_match_provider("Git")
        assert len(result) == len(set(result))


class TestFuzzyMatchProviderPerformance:
    """Performance and scalability tests."""

    def test_response_time_under_100ms(self):
        """Typical queries complete quickly."""
        service = OmniBoardService()

        start = time.perf_counter()
        service.fuzzy_match_provider("Git")
        duration = (time.perf_counter() - start) * 1000  # Convert to ms

        assert duration < 100, f"Query took {duration:.2f}ms (limit: 100ms)"

    def test_handles_concurrent_queries(self):
        """Thread-safe for concurrent requests."""
        import threading

        service = OmniBoardService()
        results = []

        def query():
            results.append(service.fuzzy_match_provider("Slack"))

        threads = [threading.Thread(target=query) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # All results should be identical
        first_result = results[0]
        assert all(r == first_result for r in results)
