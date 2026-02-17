"""
Server-Side Request Forgery (SSRF) Protection Utilities.

Provides URL validation to prevent SSRF attacks by checking:
- Allowed schemes (http, https)
- Private, loopback, link-local, multicast, and reserved IP ranges (IPv4 and IPv6)
- Hostname resolution to IP
"""

import asyncio
import ipaddress
import socket
from urllib.parse import urlparse


async def validate_url_async(url: str) -> str:
    """
    Asynchronously validate URL to prevent SSRF attacks.
    Runs DNS resolution in a thread executor to avoid blocking the event loop.

    Args:
        url: The URL to validate.

    Returns:
        The validated URL if safe.

    Raises:
        ValueError: If the URL is invalid or points to a restricted IP.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, validate_url, url)


def validate_url(url: str) -> str:
    """
    Validate URL to prevent SSRF attacks.

    Args:
        url: The URL to validate.

    Returns:
        The validated URL if safe.

    Raises:
        ValueError: If the URL is invalid or points to a restricted IP.
    """
    if not url:
        raise ValueError("URL cannot be empty")

    try:
        parsed = urlparse(url)
    except Exception as e:
        raise ValueError(f"Invalid URL format: {e}") from e

    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Invalid URL scheme: {parsed.scheme}. Only http and https are allowed.")

    hostname = parsed.hostname
    if not hostname:
        # urlparse might return empty hostname if scheme is missing or malformed
        raise ValueError("URL must have a hostname")

    # Check for IP literal in hostname (e.g., [::1] or 127.0.0.1)
    try:
        # Strip brackets for IPv6 literals
        ip_obj = ipaddress.ip_address(hostname.strip("[]"))
        _check_ip(ip_obj)
        # If it's an IP literal and passes checks, it's safe.
        return url
    except ValueError:
        # Not an IP literal, proceed to resolution
        pass

    # Resolve hostname to IP(s)
    try:
        # getaddrinfo returns a list of (family, type, proto, canonname, sockaddr)
        # We only care about the sockaddr (IP)
        # Use AI_ADDRCONFIG to filter out IPv6 if system doesn't support it, but
        # for security, we want to see ALL resolutions.
        addr_infos = socket.getaddrinfo(hostname, None)  # NOSONAR: DNS lookup is required for SSRF validation
    except socket.gaierror as e:
        raise ValueError(f"Could not resolve hostname {hostname}: {e}") from e

    if not addr_infos:
        raise ValueError(f"No IP addresses found for hostname {hostname}")

    for info in addr_infos:
        # sockaddr is (address, port) for IPv4, (address, port, flowinfo, scopeid) for IPv6
        ip_str = info[4][0]
        try:
            # Handle zone indices (scope IDs) in IPv6 addresses if present (e.g., fe80::1%eth0)
            if "%" in ip_str:
                ip_str = ip_str.split("%")[0]

            ip_obj = ipaddress.ip_address(ip_str)
            _check_ip(ip_obj)
        except ValueError as e:
            # Re-raise with context if check fails
            raise ValueError(f"Resolved IP {ip_str} for {hostname} is blocked: {e}") from e

    return url


def _check_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
    """
    Check if IP address is allowed.

    Raises:
        ValueError: If IP is in a restricted range.
    """
    if ip.is_unspecified:
        raise ValueError(f"Unspecified address {ip} is not allowed")
    if ip.is_loopback:
        raise ValueError(f"Loopback address {ip} is not allowed")
    if ip.is_link_local:
        raise ValueError(f"Link-local address {ip} is not allowed")
    if ip.is_multicast:
        raise ValueError(f"Multicast address {ip} is not allowed")
    if ip.is_reserved:
        raise ValueError(f"Reserved address {ip} is not allowed")
    if ip.is_private:
        raise ValueError(f"Private address {ip} is not allowed")

    # Specific checks for IPv6 (some might be covered by above, but being explicit is safer)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        # IPv4-mapped IPv6 addresses (::ffff:127.0.0.1) should also be checked against IPv4 rules
        _check_ip(ip.ipv4_mapped)
