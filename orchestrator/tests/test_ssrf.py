"""Tests for SSRF protection utilities."""

import socket
from unittest.mock import patch

import pytest

from security.ssrf import validate_url


class TestValidateUrl:
    def test_valid_public_url(self):
        """Test that valid public URLs are allowed."""
        # Using example.com which resolves to public IP
        # mocking socket.getaddrinfo to avoid real DNS lookup and ensure deterministic behavior
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80))
            ]
            url = "http://example.com"  # NOSONAR
            assert validate_url(url) == url

    def test_https_scheme_allowed(self):
        """Test that https scheme is allowed."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))
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
        # Split strings to potentially avoid naive grep detection, though NOSONAR is safer
        private_ips = [
            "http://127.0.0.1",  # NOSONAR
            "http://10.0.0.1",   # NOSONAR
            "http://192.168.1.1",# NOSONAR
            "http://172.16.0.1", # NOSONAR
            "http://[::1]",      # NOSONAR
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
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 80))
            ]
            with pytest.raises(ValueError, match="Loopback address"):
                validate_url("http://localhost")  # NOSONAR

    def test_mixed_resolution(self):
        """Test that if ANY resolved IP is private, it raises ValueError."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            # Returns one public and one private IP (DNS rebinding scenario or split horizon)
            mock_getaddrinfo.return_value = [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80)),
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.1", 80)),
            ]
            with pytest.raises(ValueError, match="Private address"):
                validate_url("http://example.com")  # NOSONAR

    def test_ipv6_resolution(self):
        """Test IPv6 resolution handling."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            # IPv6 Loopback
            mock_getaddrinfo.return_value = [
                (socket.AF_INET6, socket.SOCK_STREAM, 6, "", ("::1", 80, 0, 0))
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
