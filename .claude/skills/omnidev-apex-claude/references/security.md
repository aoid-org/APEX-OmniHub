# SECURITY FORTRESS — OMNIDEV-APEX Reference

## Activation
Triggered by: security, auth, encryption, zero-trust, SBOM, supply chain, vulnerability, CVE, secrets, injection, XSS, CSRF

## Automated Security Scans (bash_tool — evidence required)
```bash
# Dependency audit
npm audit --audit-level=high       # exit non-zero on high/crit
pip audit                           # Python
cargo audit                         # Rust

# SAST
semgrep --config=auto --error .    # exit non-zero on findings

# Container
trivy image --exit-code 1 --severity HIGH,CRITICAL <image>

# IaC
tfsec .                            # Terraform
checkov -d .                       # all IaC

# SBOM
syft . -o spdx-json > sbom.json
grype sbom:sbom.json --fail-on high
```

## Zero-Trust Checklist (every service boundary)
- [ ] Service-to-service: mTLS enforced, no plain HTTP between services
- [ ] Credentials: short-lived (≤1h), rotated automatically
- [ ] Secrets: external secrets manager (Vault/AWS SM), never env in Dockerfile
- [ ] Network: default-deny policy, allowlist only known traffic
- [ ] Endpoints: authenticated + authorized — every single one
- [ ] User input: validated + sanitized + rate-limited at ingress
- [ ] LLM boundary: prompt injection defense active
- [ ] Webhooks: signature verified before any processing

## Auth Patterns

### JWT (production-grade)
```typescript
// Issue: short TTL + refresh rotation
const accessToken = jwt.sign(
  { sub: userId, role, scope: ['read:own'] },
  process.env.JWT_SECRET!,
  { expiresIn: '15m', algorithm: 'RS256' } // RS256, not HS256 for multi-service
);

// Verify: reject expired, wrong algo, missing claims
function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://auth.apexbusiness.com',
    });
    return payloadSchema.parse(payload); // Zod validate claims
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
```

### RBAC Pattern
```typescript
function requireRole(requiredRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // set by auth middleware
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!hasRole(user, requiredRole)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
// NEVER: if (user.role === 'admin') — use enum + exhaustive check
```

## Supply Chain Security
```yaml
# .github/workflows/sbom.yml
- name: Generate SBOM
  run: syft . -o spdx-json > sbom.json

- name: Vulnerability scan SBOM
  run: grype sbom:sbom.json --fail-on high

- name: Sign image
  run: |
    cosign sign --key env://COSIGN_KEY \
      ${{ env.REGISTRY }}/${{ env.IMAGE }}@${{ steps.build.outputs.digest }}
```

## OWASP Top 10 Mitigations

| Vulnerability | Mitigation | Verification |
|--------------|------------|-------------|
| A01 Broken Access Control | RBAC middleware on every route | Auth test suite |
| A02 Cryptographic Failures | TLS 1.3 only, AES-256, bcrypt cost≥12 | tls-checker |
| A03 Injection | Parameterized queries, Zod validation | semgrep rules |
| A04 Insecure Design | Threat model per feature | ADR document |
| A05 Security Misconfiguration | Helm/Terraform security defaults | tfsec/checkov |
| A06 Vulnerable Components | npm audit + Renovate + SBOM | CI gate |
| A07 Auth Failures | MFA, rate limit, JWT RS256 | Auth test suite |
| A08 Integrity Failures | SBOM + Cosign + SLSA Level 2 | CI gate |
| A09 Logging Failures | OTel + structured logs, no PII | Log audit |
| A10 SSRF | URL allowlist, no user-controlled fetch | semgrep |
