"""
Network-facing tool activities: call_webhook and search_youtube (SSRF-guarded).

Split from activities/tool_executors.py to hold the 500-line APEX policy
ceiling. Same late-binding rule as its siblings: names that tests patch on
activities.tools resolve through ``_ns()``.
"""

import contextlib
import ipaddress
import json
import os
import sys
from typing import Any
from urllib.parse import urlparse, urlunparse

import httpx
from temporalio import activity


def _ns():
    """Late-bound activities.tools module namespace (mock.patch semantics)."""
    return sys.modules["activities.tools"]


@activity.defn(name="call_webhook")
async def call_webhook(params: dict[str, Any]) -> dict[str, Any]:
    """
    Call external webhook. Durable idempotency protection included.
    """

    url = str(params.get("url", ""))
    method = params.get("method", "POST")
    payload = params.get("payload", {})

    # Generate idempotency key based on workflow and step
    try:
        if not hasattr(activity, "info"):
            raise RuntimeError("mocked")
        info = _ns().activity.info()
        workflow_id = info.workflow_id or ""
        step_id = params.get("step_id", info.activity_id)
    except Exception:
        # Fallback for testing environments without temporal context
        workflow_id = "test-workflow"
        step_id = params.get("step_id", "test-step")

    idempotency_key = f"{workflow_id}:{step_id}:call_webhook"

    db = _ns().get_database_provider()

    cached = await _ns()._idempotency_guard(db, idempotency_key, "call_webhook", workflow_id)
    if cached is not None:
        return cached

    try:
        validated_url = await _ns().validate_url_with_dns_pin_async(url)
    except ValueError as e:
        _ns().activity.logger.error(f"Blocked SSRF attempt: {e}")
        result = {
            "success": False,
            "error": f"Security violation: {e!s}",
            "status_code": 403,
        }

        # Record failure
        with contextlib.suppress(Exception):
            await db.update(
                table="idempotency_ledger",
                updates={"status": "failed", "result_payload": json.dumps(result)},
                filters={"idempotency_key": idempotency_key},
            )

        return result

    request_headers: dict[str, str] = {}
    parsed = urlparse(validated_url.original_url)
    request_url = validated_url.original_url
    if parsed.hostname and not _is_ip_literal(parsed.hostname):
        pinned_netloc = parsed.netloc.replace(parsed.hostname, validated_url.resolved_ip, 1)
        request_url = urlunparse(parsed._replace(netloc=pinned_netloc))
        request_headers["Host"] = validated_url.host_header

    _ns().activity.logger.info(f"Calling webhook: {method} {validated_url.original_url}")

    # Ignore process proxy variables: using a proxy would bypass the DNS-pinned
    # destination selected by the SSRF guard above.
    async with httpx.AsyncClient(follow_redirects=False, trust_env=False) as client:
        try:
            response = await client.request(  # NOSONAR - URL validated by SSRF guard above
                method=method,
                url=request_url,
                json=payload,
                headers=request_headers,
                timeout=15.0,
            )

            result = {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "body": response.text,
            }

            # Record success
            try:
                await db.update(
                    table="idempotency_ledger",
                    updates={"status": "completed", "result_payload": json.dumps(result)},
                    filters={"idempotency_key": idempotency_key},
                )
            except Exception as e:
                _ns().activity.logger.warning(f"Failed to record webhook success in ledger: {e}")

            return result

        except Exception as e:
            result = {"success": False, "error": str(e)}
            # Record failure
            with contextlib.suppress(Exception):
                await db.update(
                    table="idempotency_ledger",
                    updates={"status": "failed", "result_payload": json.dumps(result)},
                    filters={"idempotency_key": idempotency_key},
                )
            raise


def _is_ip_literal(value: str) -> bool:
    try:
        ipaddress.ip_address(value.strip("[]"))
        return True
    except ValueError:
        return False


@activity.defn(name="search_youtube")
async def search_youtube(params: dict[str, Any]) -> dict[str, Any]:
    """
    Search YouTube for videos.

    Args:
        params: {
            "query": "funny cats"
        }

    Returns:
        List of videos
    """
    query = params.get("query")
    if not query:
        return {"success": False, "error": "query parameter is required", "videos": []}

    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "YouTube integration not configured — YOUTUBE_API_KEY env var is missing",
            "videos": [],
        }

    _ns().activity.logger.info(f"Searching YouTube for: {query}")

    max_results = int(params.get("max_results", 5))
    url = "https://www.googleapis.com/youtube/v3/search"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            url,
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": max_results,
                "key": api_key,
            },
        )
        if resp.status_code != 200:
            _ns().activity.logger.error(f"YouTube API error {resp.status_code}: {resp.text[:200]}")
            return {
                "success": False,
                "error": f"YouTube API returned HTTP {resp.status_code}",
                "videos": [],
            }
        data = resp.json()

    videos = [
        {
            "title": item["snippet"]["title"],
            "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            "description": item["snippet"]["description"],
            "channel": item["snippet"]["channelTitle"],
            "published_at": item["snippet"]["publishedAt"],
        }
        for item in data.get("items", [])
        if item.get("id", {}).get("videoId")
    ]

    return {"success": True, "videos": videos, "total_results": len(videos)}
