"""
Verify Web3 entitlement for physical agent actions.

Calls Supabase Edge Function verify-nft using a service-signed request.
"""

from __future__ import annotations

import hmac
import json
import os
import time
from typing import Any

import httpx
from supabase import create_client
from temporalio import activity
from temporalio.exceptions import ApplicationError


def _build_service_signature(body: str, timestamp: str, service_key: str) -> str:
    payload = f"{timestamp}.{body}".encode()
    return hmac.new(service_key.encode(), payload, digestmod="sha256").hexdigest()


def _get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ApplicationError(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", non_retryable=True
        )
    return create_client(url, key)


@activity.defn(name="verify_nft_entitlement")
async def verify_nft_entitlement(params: dict[str, Any]) -> dict[str, Any]:
    """
    Verify AgentKey signature and Membership NFT ownership.

    Required params:
        - workflow_execution_id: str
        - user_id: str
        - agent_key: str (optional if device_id provided)
        - agent_signature: str (optional if device_id provided)
        - wallet_address: str (optional if device_id provided)
        - device_id: str (optional, used to resolve from device_registry)
    """
    try:
        supabase = _get_supabase_client()

        agent_key = params.get("agent_key")
        agent_signature = params.get("agent_signature")
        wallet_address = params.get("wallet_address")
        device_id = params.get("device_id")
        user_id = params.get("user_id")

        if device_id and user_id and (not agent_key or not agent_signature or not wallet_address):
            record = (
                supabase.table("device_registry")
                .select("device_info")
                .eq("user_id", user_id)
                .eq("device_id", device_id)
                .limit(1)
                .execute()
            )
            if record.data:
                device_info = record.data[0].get("device_info") or {}
                agent_key = agent_key or device_info.get("agentKey") or device_info.get("agent_key")
                agent_signature = (
                    agent_signature
                    or device_info.get("agentSignature")
                    or device_info.get("agent_signature")
                )
                wallet_address = (
                    wallet_address
                    or device_info.get("walletAddress")
                    or device_info.get("wallet_address")
                )

        if not agent_key or not agent_signature or not wallet_address:
            raise ApplicationError(
                "Missing agent_key, agent_signature, or wallet_address", non_retryable=True
            )

        timestamp = str(int(time.time()))
        body = json.dumps(
            {
                "wallet_address": wallet_address,
                "agent_key": agent_key,
                "agent_signature": agent_signature,
            },
            sort_keys=True,
        )

        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        signature = _build_service_signature(body, timestamp, service_key)
        supabase_url = os.getenv("SUPABASE_URL", "")

        url = f"{supabase_url}/functions/v1/verify-nft"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "x-apex-service-timestamp": timestamp,
                    "x-apex-service-signature": signature,
                },
                content=body,
            )

        if resp.status_code >= 400:
            raise ApplicationError(f"verify-nft failed: {resp.text}", non_retryable=True)

        data = resp.json()
        if not data.get("hasPremiumNFT") or data.get("agent_key_verified") is not True:
            raise ApplicationError("NFT entitlement verification failed", non_retryable=True)

        return {"verified": True, "wallet_address": wallet_address}

    except ApplicationError:
        raise
    except Exception as exc:
        raise ApplicationError(str(exc), non_retryable=True) from exc
