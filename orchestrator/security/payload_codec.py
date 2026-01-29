"""
Temporal payload encryption codec using Fernet (AES-128-GCM).

Encrypts workflow/activity payloads at rest in Temporal history and visibility storage.
Falls back to the default data converter when `TEMPORAL_PAYLOAD_KEY` is not configured.
"""

from __future__ import annotations

import logging
import os
from typing import List

from cryptography.fernet import Fernet, InvalidToken
from temporalio import converter
from temporalio.api.common.v1 import Payload


class FernetPayloadCodec(converter.PayloadCodec):
    """Encrypt/decrypt Temporal payloads using Fernet symmetric encryption."""

    def __init__(self, key: bytes):
        self._fernet = Fernet(key)

    async def encode(self, payloads: List[Payload]) -> List[Payload]:
        encrypted: List[Payload] = []
        for payload in payloads:
            raw = payload.SerializeToString()
            token = self._fernet.encrypt(raw)
            encrypted.append(
                Payload(
                    metadata={b"encoding": b"binary/encrypted"},
                    data=token,
                )
            )
        return encrypted

    async def decode(self, payloads: List[Payload]) -> List[Payload]:
        decoded: List[Payload] = []
        for payload in payloads:
            if payload.metadata.get(b"encoding") != b"binary/encrypted":
                decoded.append(payload)
                continue

            try:
                raw = self._fernet.decrypt(payload.data)
                decoded_payload = Payload()
                decoded_payload.ParseFromString(raw)
                decoded.append(decoded_payload)
            except InvalidToken as exc:  # pragma: no cover - safety net
                raise converter.PayloadCodecException("Failed to decrypt Temporal payload") from exc
        return decoded


def build_encrypted_data_converter() -> converter.DataConverter:
    """
    Build a Temporal data converter with encryption if the key is configured.

    Environment variables:
        TEMPORAL_PAYLOAD_KEY or TEMPORAL_PAYLOAD_ENCRYPTION_KEY: Fernet key (base64 urlsafe)
    """
    key = os.getenv("TEMPORAL_PAYLOAD_KEY") or os.getenv("TEMPORAL_PAYLOAD_ENCRYPTION_KEY")
    if not key:
        logging.warning(
            "TEMPORAL_PAYLOAD_KEY not set; Temporal payloads will be stored unencrypted."
        )
        return converter.DataConverter.default

    try:
        key_bytes = key.encode()
        # Validate key eagerly
        Fernet(key_bytes)
    except Exception as exc:  # pragma: no cover - configuration error
        logging.error("Invalid TEMPORAL_PAYLOAD_KEY provided: %s", exc)
        raise

    codec = FernetPayloadCodec(key_bytes)
    return converter.DataConverter(payload_codec=codec)
