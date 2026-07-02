"""
LiteEmbedder — proprietary, stdlib-only text encoder for low-memory workers.

Why this exists (FR4, AUDIT_2026-07.md §4): the full semantic cache loads a
sentence-transformers/PyTorch model that OOMs the 512 MB production worker,
so caching has been disabled in prod. This encoder restores plan caching at
zero infra cost: no torch, no model weights, no network — only hashlib and
numpy (both already shipped).

Technique: signed feature hashing ("hashing trick") over word tokens and
character 3–5-grams, accumulated into a fixed 384-dim float32 vector and
L2-normalized so Redis KNN cosine similarity works unchanged. Deterministic:
same text → same vector, across processes and deploys.

Honest capability statement: this is *lexical* similarity. It reliably hits
on repeated and near-duplicate goal templates (the dominant cache-hit class
after EntityExtractor templating) but does not generalize across true
paraphrases the way transformer embeddings do. Prod hit-rate is measured via
the semantic_cache_lookups metric either way; the vector spaces are never
mixed (separate Redis index/key namespace per encoder).

Duck-type contract (subset of SentenceTransformer used by SemanticCacheService):
    encode(text, convert_to_numpy=True) -> np.ndarray[float32, (dim,)]
    get_sentence_embedding_dimension() -> int
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Iterator

import numpy as np

_TOKEN_RE = re.compile(r"[a-z0-9]+|\{[A-Z_]+\}")

_DEFAULT_DIM = 384  # matches the all-MiniLM-L6-v2 index layout
_NGRAM_SIZES = (3, 4, 5)


class LiteEmbedder:
    """Deterministic hashed n-gram embedder. See module docstring."""

    #: Namespace suffix for Redis index/key isolation from transformer vectors.
    cache_namespace = "lite-v1"

    def __init__(self, dim: int = _DEFAULT_DIM):
        if dim <= 0:
            raise ValueError("dim must be positive")
        self._dim = dim

    def get_sentence_embedding_dimension(self) -> int:
        return self._dim

    def encode(self, text: str, convert_to_numpy: bool = True) -> np.ndarray:  # noqa: ARG002
        """
        Encode text into a normalized float32 vector.

        `convert_to_numpy` is accepted for SentenceTransformer signature
        compatibility; output is always a numpy array.
        """
        vec = np.zeros(self._dim, dtype=np.float64)

        for feature, weight in self._features(text):
            digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
            bucket = int.from_bytes(digest[:4], "big") % self._dim
            sign = 1.0 if digest[4] & 1 else -1.0
            vec[bucket] += sign * weight

        norm = float(np.linalg.norm(vec))
        if norm > 0.0:
            vec /= norm
        return vec.astype(np.float32)

    @staticmethod
    def _features(text: str) -> Iterator[tuple[str, float]]:
        """Yield (feature, weight) pairs: word tokens weighted above char n-grams."""
        lowered = text.lower()
        tokens = _TOKEN_RE.findall(lowered)

        for token in tokens:
            yield f"w:{token}", 2.0

        compact = " ".join(tokens)
        for size in _NGRAM_SIZES:
            for i in range(max(0, len(compact) - size + 1)):
                yield f"g{size}:{compact[i : i + size]}", 1.0
