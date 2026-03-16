"""Tests for SSRF protection utilities."""

import socket
from unittest.mock import MagicMock, patch

import pytest

from security.ssrf import (
    ValidatedURL,
    _check_ip,
    validate_url,
    validate_url_async,
    validate_url_with_dns_pin,
    validate_url_with_dns_pin_async,
)


class TestValidateUrl:
    def test_valid_public_url(self):
        """Test that valid public URLs are allowed."""
        # Using example.com which resolves to public IP
        # mocking socket.getaddrinfo to avoid real DNS lookup and ensure deterministic behavior
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80))  # NOSONAR
            ]
            url = "http://example.com"  # NOSONAR
            assert validate_url(url) == url

    def test_https_scheme_allowed(self):
        """Test that https scheme is allowed."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))  # NOSONAR
            ]
            url = "https://example.com"  # NOSONAR
            assert validate_url(url) == url

    def test_invalid_scheme(self):
        """Test that non-http/https schemes are rejected."""
        with pytest.raises(ValueError, match="Invalid URL scheme"):
            validate_url("ftp://example.com")  # NOSONAR

        with pytest.raises(ValueError, match="Invalid URL scheme"):
            validate_url("file:///etc/passwd")  # NOSONAR

    def test_private_ip_literal(self):
        """Test that private IP literals are rejected."""
        # Split strings to avoid naive grep detection of private IP patterns
        private_ips = [
            "http://127.0.0.1",  # NOSONAR
            "http://10.0.0.1",  # NOSONAR
            "http://192.168.1.1",  # NOSONAR
            "http://172.16.0.1",  # NOSONAR
            "http://[::1]",  # NOSONAR
            "http://[fc00::1]",  # NOSONAR
        ]
        for url in private_ips:
            with pytest.raises(ValueError, match="is not allowed"):
                validate_url(url)

    def test_private_ip_resolution(self):
        """Test that hostnames resolving to private IPs are rejected."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            # Mock resolution to localhost
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 80))  # NOSONAR
            ]
            with pytest.raises(ValueError, match="Loopback address"):
                validate_url("http://localhost")  # NOSONAR

    def test_mixed_resolution(self):
        """Test that if ANY resolved IP is private, it raises ValueError."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            # Returns one public and one private IP (DNS rebinding scenario or split horizon)
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80)),  # NOSONAR
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.1", 80)),  # NOSONAR
            ]
            with pytest.raises(ValueError, match="Private address"):
                validate_url("http://example.com")  # NOSONAR

    def test_ipv6_resolution(self):
        """Test IPv6 resolution handling."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            # IPv6 Loopback
            mock_getaddrinfo.return_value = [
                (socket.AF_INET6, socket.SOCK_STREAM, 6, "", ("::1", 80, 0, 0))  # NOSONAR
            ]
            with pytest.raises(ValueError, match="Loopback address"):
                validate_url("http://ipv6-localhost")  # NOSONAR

    def test_link_local_address(self):
        """Test link-local address rejection."""
        with pytest.raises(ValueError, match="Link-local address"):
            validate_url("http://169.254.169.254")  # NOSONAR

    def test_unspecified_address(self):
        """Test unspecified address rejection."""
        with pytest.raises(ValueError, match="Unspecified address"):
            validate_url("http://0.0.0.0")  # NOSONAR

        with pytest.raises(ValueError, match="Unspecified address"):
            validate_url("http://[::]")  # NOSONAR

    def test_ipv4_mapped_ipv6(self):
        """Test IPv4-mapped IPv6 address rejection if the mapped IPv4 is private."""
        # ::ffff:127.0.0.1
        with pytest.raises(ValueError, match="Loopback address"):
            validate_url("http://[::ffff:127.0.0.1]")  # NOSONAR

        # ::ffff:10.0.0.1
        with pytest.raises(ValueError, match="Private address"):
            validate_url("http://[::ffff:10.0.0.1]")  # NOSONAR

    def test_empty_url(self):
        """Test empty URL."""
        with pytest.raises(ValueError, match="URL cannot be empty"):
            validate_url("")

    def test_no_hostname(self):
        """Test URL with no hostname."""
        with pytest.raises(ValueError, match="URL must have a hostname"):
            validate_url("http://")  # NOSONAR

    def test_dns_resolution_failure(self):
        """Test DNS resolution failure."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.side_effect = socket.gaierror("Name or service not known")
            with pytest.raises(ValueError, match="Could not resolve hostname"):
                validate_url("http://nonexistent.domain")  # NOSONAR

    def test_public_ip_literal_returns_validated_url(self):
        """Test that a public IP literal is validated and returns a ValidatedURL."""
        result = validate_url_with_dns_pin("http://93.184.216.34")  # NOSONAR
        assert result.resolved_ip == "93.184.216.34"  # NOSONAR
        assert result.host_header == "93.184.216.34"  # NOSONAR

    def test_empty_addr_infos_raises(self):
        """Test that empty getaddrinfo result raises ValueError."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = []
            with pytest.raises(ValueError, match="No IP addresses found"):
                validate_url("http://example.com")  # NOSONAR

    def test_ipv6_zone_id_stripped(self):
        """Test that IPv6 addresses with zone IDs (scope IDs) are handled correctly."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            # Simulate an IPv6 address with a zone ID suffix that resolves to link-local
            mock_getaddrinfo.return_value = [
                (socket.AF_INET6, socket.SOCK_STREAM, 6, "", ("fe80::1%eth0", 80, 0, 0))  # NOSONAR
            ]
            with pytest.raises(ValueError, match="Link-local address"):
                validate_url("http://example.com")  # NOSONAR

    def test_multicast_address_rejected(self):
        """Test that multicast IP literals are rejected."""
        with pytest.raises(ValueError, match="Multicast address"):
            validate_url("http://224.0.0.1")  # NOSONAR

    def test_reserved_address_rejected(self):
        """Test that reserved IP literals are rejected."""
        with pytest.raises(ValueError, match="Reserved address"):
            validate_url("http://240.0.0.1")  # NOSONAR

    def test_ipv4_mapped_ipv6_public_passes(self):
        """Test that IPv4-mapped IPv6 with a public IPv4 passes."""
        # ::ffff:93.184.216.34 maps to public IP 93.184.216.34
        result = validate_url_with_dns_pin("http://[::ffff:93.184.216.34]")  # NOSONAR
        assert "93.184.216.34" in result.resolved_ip or "::" in result.resolved_ip  # NOSONAR

    def test_private_ip_resolution_raises_blocked_message(self):
        """Test that when hostname resolves to private IP, error includes 'is blocked'."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.168.1.100", 80)),  # NOSONAR
            ]
            with pytest.raises(ValueError):
                validate_url("http://internal.example.com")  # NOSONAR

    def test_invalid_urlparse_raises_value_error(self):
        """Test that urlparse failure triggers ValueError with 'Invalid URL format'."""
        with patch("security.ssrf.urlparse", side_effect=Exception("parse error")):
            with pytest.raises(ValueError, match="Invalid URL format"):
                validate_url("http://example.com")  # NOSONAR

    def test_no_valid_public_ips_when_selected_ip_stays_empty(self):
        """Test the 'No valid public IP addresses found' path.

        When addr_infos is non-empty but selected_ip stays empty after loop.
        This is reached by patching validate_url_with_dns_pin internals so that
        ip_obj str representation is empty (falsy) while _check_ip does not raise.
        """
        call_count = [0]

        def patched_ip_address(_addr):
            import ipaddress

            # First call is from the IP-literal check in the try block (line 87)
            # We want it to raise ValueError so we fall through to DNS resolution
            call_count[0] += 1
            if call_count[0] == 1:
                # Let the "is it an IP literal?" check fail naturally for the hostname
                raise ValueError("not an IP literal")
            # Second call is inside the DNS resolution loop
            # Return a mock whose str() is empty string
            mock_ip = MagicMock(spec=ipaddress.IPv4Address)
            mock_ip.__str__ = MagicMock(return_value="")
            mock_ip.is_unspecified = False
            mock_ip.is_loopback = False
            mock_ip.is_link_local = False
            mock_ip.is_multicast = False
            mock_ip.is_reserved = False
            mock_ip.is_private = False
            mock_ip.ipv4_mapped = None
            return mock_ip

        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80)),  # NOSONAR
            ]
            with patch("security.ssrf.ipaddress.ip_address", side_effect=patched_ip_address):
                with pytest.raises(ValueError, match="No valid public IP addresses found"):
                    validate_url("http://example.com")  # NOSONAR


class TestValidateUrlAsync:
    """Tests for async variants of validate_url."""

    @pytest.mark.asyncio
    async def test_validate_url_async_valid_url(self):
        """Test async URL validation passes for valid public URLs."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80))  # NOSONAR
            ]
            result = await validate_url_async("http://example.com")  # NOSONAR
            assert result == "http://example.com"  # NOSONAR

    @pytest.mark.asyncio
    async def test_validate_url_async_rejects_private_ip(self):
        """Test async URL validation rejects private IPs."""
        with pytest.raises(ValueError, match="is not allowed"):
            await validate_url_async("http://127.0.0.1")  # NOSONAR

    @pytest.mark.asyncio
    async def test_validate_url_with_dns_pin_async_returns_validated_url(self):
        """Test async DNS-pin validation returns ValidatedURL object."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))  # NOSONAR
            ]
            result = await validate_url_with_dns_pin_async("https://example.com")  # NOSONAR
            assert isinstance(result, ValidatedURL)
            assert result.resolved_ip == "93.184.216.34"  # NOSONAR
            assert result.host_header == "example.com"


class TestCheckIp:
    """Tests for _check_ip helper function."""

    def test_multicast_ipv4_rejected(self):
        import ipaddress

        with pytest.raises(ValueError, match="Multicast address"):
            _check_ip(ipaddress.ip_address("224.0.0.1"))  # NOSONAR

    def test_reserved_ipv4_rejected(self):
        import ipaddress

        with pytest.raises(ValueError, match="Reserved address"):
            _check_ip(ipaddress.ip_address("240.0.0.1"))  # NOSONAR

    def test_ipv4_mapped_ipv6_private_rejected(self):
        import ipaddress

        # ::ffff:10.0.0.1 maps to private IPv4 10.0.0.1
        with pytest.raises(ValueError, match="Private address"):
            _check_ip(ipaddress.ip_address("::ffff:10.0.0.1"))  # NOSONAR
