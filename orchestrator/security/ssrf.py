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
from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True)
class ValidatedURL:
    """Validated request target with DNS-pinned IP for outbound calls."""

    original_url: str
    resolved_ip: str
    host_header: str


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
    validated = await loop.run_in_executor(None, validate_url_with_dns_pin, url)
    return validated.original_url


async def validate_url_with_dns_pin_async(url: str) -> ValidatedURL:
    """Async wrapper returning pinned DNS resolution for request execution."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, validate_url_with_dns_pin, url)


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
    return validate_url_with_dns_pin(url).original_url


def validate_url_with_dns_pin(url: str) -> ValidatedURL:
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
        return ValidatedURL(
            original_url=urlparse(url).geturl(),
            resolved_ip=str(ip_obj),
            host_header=hostname,
        )
    except ValueError:
        # Not an IP literal, proceed to resolution
        pass

    # Resolve hostname to IP(s)
    try:
        # getaddrinfo returns a list of (family, type, proto, canonname, sockaddr)
        # We only care about the sockaddr (IP)
        # Use AI_ADDRCONFIG to filter out IPv6 if system doesn't support it, but
        # for security, we want to see ALL resolutions.
        addr_infos = socket.getaddrinfo(hostname, None)  # nosonar
    except socket.gaierror as e:
        raise ValueError(f"Could not resolve hostname {hostname}: {e}") from e

    if not addr_infos:
        raise ValueError(f"No IP addresses found for hostname {hostname}")

    selected_ip = ""
    for info in addr_infos:
        # sockaddr is (address, port) for IPv4, (address, port, flowinfo, scopeid) for IPv6
        ip_str = str(info[4][0])
        try:
            # Handle zone indices (scope IDs) in IPv6 addresses if present (e.g., fe80::1%eth0)
            if "%" in ip_str:
                ip_str = ip_str.split("%")[0]

            ip_obj = ipaddress.ip_address(ip_str)
            _check_ip(ip_obj)
            if not selected_ip:
                selected_ip = str(ip_obj)
        except ValueError as e:
            # Re-raise with context if check fails
            raise ValueError(f"Resolved IP {ip_str} for {hostname} is blocked: {e}") from e

    if not selected_ip:
        raise ValueError(f"No valid public IP addresses found for hostname {hostname}")

    # Reconstruct URL with the validated hostname to strip any zone IDs or
    # other fragments that passed through urlparse but could bypass downstream checks
    normalized_url = urlparse(url).geturl()

    return ValidatedURL(
        original_url=normalized_url,
        resolved_ip=selected_ip,
        host_header=hostname,
    )


def _check_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
    """
    Check if IP address is allowed.

    Raises:
        ValueError: If IP is in a restricted range.
    """
    # FIX: IPv4-mapped IPv6 addresses (::ffff:x.x.x.x) must be evaluated by their
    # embedded IPv4 address, not by IPv6 class rules. Python's ipaddress marks the
    # entire ::ffff:0:0/96 block as is_reserved=True, which would (a) incorrectly
    # block public IPv4-mapped addresses and (b) produce "Reserved address" instead
    # of the semantically correct "Loopback address"/"Private address" for restricted
    # ones. Checking ipv4_mapped first avoids both problems.
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        _check_ip(ip.ipv4_mapped)
        return  # Public IPv4-mapped passes; restricted ones raise from the recursive call

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
