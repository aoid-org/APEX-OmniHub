/**
 * ============================================================
 * CockpitCrypto: AEAD Encryption for BYOM Provider Credentials
 * ============================================================
 *
 * Project:    APEX OmniHub — Project COCKPIT (BYOM Architecture)
 * Module:     cockpit-crypto
 * Version:    1.0.0
 * Date:       2026-02-17
 * Author:     APEX Business Systems Engineering
 * License:    Proprietary — APEX Business Systems
 * Reference:  byom 3.md §2C — Cryptographic Implementation Specification
 *
 * SECURITY ARCHITECTURE:
 * - Algorithm: AES-256-GCM (Authenticated Encryption with Associated Data)
 * - Key Derivation: HKDF-SHA256 (per-tenant cryptographic isolation)
 * - Master Key: Derived from SUPABASE_SERVICE_ROLE_KEY (NEVER used directly)
 * - IV: 96 bits, randomly generated per encryption operation
 * - Auth Tag: 128 bits, automatically verified on decrypt
 *
 * COMPLIANCE:
 * - FIPS 140-2 compliant (AES-GCM approved cipher)
 * - NIST SP 800-38D recommendations followed
 * - Zero plaintext storage guarantee enforced
 *
 * WIRE FORMAT:
 * credential_ciphertext = [IV (12 bytes) || Ciphertext || Auth Tag (16 bytes)]
 */

export class CockpitCrypto {
  private masterKeyMaterial: CryptoKey | null = null;
  private readonly dekCache: Map<string, { key: CryptoKey; expires: number }> =
    new Map();
  private readonly DEK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * @param serviceRoleSecret - SUPABASE_SERVICE_ROLE_KEY (min 32 chars)
   * @throws Error if secret is too short
   */
  constructor(private readonly serviceRoleSecret: string) {
    if (!serviceRoleSecret || serviceRoleSecret.length < 32) {
      throw new Error(
        "CockpitCrypto: Invalid master key length (minimum 32 characters required)"
      );
    }
  }

  // ──────────────────────────────────────────────────────────
  // Key Management
  // ──────────────────────────────────────────────────────────

  /**
   * Import master key material for HKDF derivation.
   * Cached for the lifetime of this instance.
   */
  private async getMasterKeyMaterial(): Promise<CryptoKey> {
    if (this.masterKeyMaterial) return this.masterKeyMaterial;

    const encoder = new TextEncoder();
    this.masterKeyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(this.serviceRoleSecret),
      "HKDF",
      false, // Not extractable
      ["deriveKey"]
    );
    return this.masterKeyMaterial;
  }

  /**
   * Derive tenant-specific Data Encryption Key (DEK) via HKDF-SHA256.
   * Each tenant gets a cryptographically isolated key derived from the
   * master key with tenant_id as salt — compromise of one tenant's data
   * does NOT compromise other tenants.
   *
   * @param tenantId - Tenant UUID (used as HKDF salt)
   * @returns AES-256-GCM key scoped to this tenant
   */
  private async deriveTenantDEK(tenantId: string): Promise<CryptoKey> {
    // Check cache first
    const cached = this.dekCache.get(tenantId);
    if (cached && cached.expires > Date.now()) {
      return cached.key;
    }

    const masterKey = await this.getMasterKeyMaterial();
    const encoder = new TextEncoder();

    const dek = await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: encoder.encode(tenantId),
        info: encoder.encode("cockpit-credential-encryption-v1"),
      },
      masterKey,
      { name: "AES-GCM", length: 256 },
      false, // Not extractable
      ["encrypt", "decrypt"]
    );

    // Cache DEK with TTL
    this.dekCache.set(tenantId, {
      key: dek,
      expires: Date.now() + this.DEK_CACHE_TTL_MS,
    });

    return dek;
  }

  // ──────────────────────────────────────────────────────────
  // Encrypt / Decrypt
  // ──────────────────────────────────────────────────────────

  /**
   * Encrypt a provider credential (API key or OAuth token).
   *
   * Output format: [IV (12 bytes) || Ciphertext || Auth Tag (16 bytes)]
   * Store output directly in provider_connections.credential_ciphertext.
   *
   * @param secret - Plaintext API key or OAuth token
   * @param context - { tenantId } for per-tenant key derivation
   * @returns Uint8Array for BYTEA column storage
   */
  async encrypt(
    secret: string,
    context: { tenantId: string }
  ): Promise<Uint8Array> {
    const dek = await this.deriveTenantDEK(context.tenantId);

    // 96-bit random IV (NIST SP 800-38D recommended)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encoder = new TextEncoder();
    const plaintext = encoder.encode(secret);

    // AES-GCM encrypts and appends 128-bit auth tag
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      dek,
      plaintext
    );

    // Concatenate: IV || Ciphertext+Tag
    const payload = new Uint8Array(iv.length + ciphertext.byteLength);
    payload.set(iv, 0);
    payload.set(new Uint8Array(ciphertext), iv.length);

    return payload;
  }

  /**
   * Decrypt a provider credential from database storage.
   *
   * @param payload - Uint8Array from provider_connections.credential_ciphertext
   * @param context - { tenantId } must match the tenant used during encryption
   * @returns Plaintext API key or OAuth token
   * @throws Error if decryption fails (wrong tenant, tampered data, corruption)
   */
  async decrypt(
    payload: Uint8Array,
    context: { tenantId: string }
  ): Promise<string> {
    // Minimum: 12 (IV) + 16 (auth tag) = 28 bytes for empty plaintext
    if (payload.length < 28) {
      throw new Error(
        "CockpitCrypto: Invalid ciphertext length (corrupted or truncated data)"
      );
    }

    const dek = await this.deriveTenantDEK(context.tenantId);

    const iv = payload.slice(0, 12);
    const ciphertext = payload.slice(12);

    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        dek,
        ciphertext
      );

      return new TextDecoder().decode(plaintext);
    } catch (error: unknown) {
      // Security: Log error type only (NOT details) to prevent information leakage
      const errorType = error instanceof Error ? error.constructor.name : "Unknown";
      console.warn(`CockpitCrypto: Decryption failed [${errorType}]`);
      throw new Error(
        "CockpitCrypto: Decryption failed — invalid ciphertext or tampering detected"
      );
    }
  }

  // ──────────────────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────────────────

  /**
   * Generate SHA-256 fingerprint for collision detection and audit.
   * This hash is stored in provider_connections.credential_fingerprint
   * and is safe to log (one-way, NOT reversible to plaintext).
   *
   * @param secret - Plaintext credential
   * @returns 64-character lowercase hex string
   */
  async fingerprint(secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(secret)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Extract safe hint for user display.
   * Returns last N characters of the credential (max 10 per schema constraint).
   *
   * @param secret - Plaintext credential
   * @param length - Number of trailing characters (default: 4, max: 10)
   * @returns Hint string for UI display (e.g., "proj" for key ending in "...proj")
   */
  extractHint(secret: string, length: number = 4): string {
    const effectiveLength = Math.min(Math.max(length, 1), 10);
    return secret.slice(-effectiveLength);
  }

  /**
   * Clear cached DEKs. Call on:
   * - Tenant deletion
   * - Security key rotation
   * - Memory pressure
   *
   * @param tenantId - Clear specific tenant (or all if omitted)
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.dekCache.delete(tenantId);
    } else {
      this.dekCache.clear();
    }
  }
}

// ──────────────────────────────────────────────────────────
// Singleton Factory
// ──────────────────────────────────────────────────────────

let cryptoInstance: CockpitCrypto | null = null;

/**
 * Get or create the singleton CockpitCrypto instance.
 * Reads SUPABASE_SERVICE_ROLE_KEY from Deno environment.
 *
 * @returns Initialized CockpitCrypto instance
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not set
 */
export function getCockpitCrypto(): CockpitCrypto {
  if (!cryptoInstance) {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      throw new Error(
        "CockpitCrypto: SUPABASE_SERVICE_ROLE_KEY environment variable not configured"
      );
    }
    cryptoInstance = new CockpitCrypto(serviceRoleKey);
  }
  return cryptoInstance;
}
