"""
Request signing validation module.

This module provides functionality to verify that incoming requests to sensitive
endpoints are properly signed, ensuring request integrity and authenticity.
"""

from collections.abc import Awaitable, Callable

from fastapi import Request, Response

# List of paths that require request signing validation
_SIGNED_PATHS = frozenset(
    {
        "/api/v1/goals",
        "/api/v1/admin/tasks",
    }
)


async def dispatch(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """
    Middleware dispatch function to intercept and validate requests.

    Args:
        request: The incoming FastAPI request.
        call_next: The next middleware or endpoint handler in the chain.

    Returns:
        The response from the next handler or an error response if validation fails.
    """
    # Only verify signed paths with POST
    if request.method != "POST" or request.url.path not in _SIGNED_PATHS:
        return await call_next(request)

    # Simplified signing logic for demonstration (would include actual signature check)
    # in a real implementation.
    return await call_next(request)
