import os

import redis.asyncio as redis
from fastapi import HTTPException


def get_omniboard_redis() -> "redis.Redis":
    """
    Returns a Redis client for OmniBoard session/vault storage.

    Fails closed with a typed 503 when UPSTASH_REDIS_URL is absent,
    instead of letting os.environ[...] throw a KeyError that Starlette
    surfaces as an opaque plaintext "Internal Server Error" with no code.
    """
    url = os.environ.get("UPSTASH_REDIS_URL")
    if not url:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "omniboard_redis_unconfigured",
                "message": "OmniBoard session storage is not configured on this service.",
            },
        )
    return redis.from_url(url)
