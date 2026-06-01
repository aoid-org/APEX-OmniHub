#!/usr/bin/env python3
"""
APEX PhysiOmni Node Provisioning & Credential Injector Script.

Generates Ed25519 key-pairs and X.509 certs, registers nodes via Supabase REST API,
and produces a J-Link/Serial credential flashing shell script for the physical pucks.
"""

import os
import sys
import json
import datetime
import urllib.request
from uuid import UUID, uuid4

# Import cryptography primitives
try:
    from cryptography import x509
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives.hashes import SHA256
except ImportError:
    print("Error: The 'cryptography' library is required to run this script.")
    print("Please install it using: pip install cryptography")
    sys.exit(1)

# Predefined APEX configurations
SEC_TAG = 16842

# Load environment configuration. Tenant/project values are deployment secrets.
TENANT_ID = os.getenv("PHYSIOMNI_TENANT_ID", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def require_uuid_env(name: str, value: str) -> str:
    """Return a validated UUID from the environment or fail closed."""
    try:
        return str(UUID(value))
    except (TypeError, ValueError):
        print(f"Error: {name} must be set to a valid UUID via the deployment environment.")
        sys.exit(1)


def generate_ca_and_device_credentials(device_serial: str):
    """Generate mock Root CA and Ed25519 client certificate."""
    # 1. Generate APEX Root CA
    ca_key = ed25519.Ed25519PrivateKey.generate()
    ca_name = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "CA"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Alberta"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Edmonton"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "APEX Business Systems LTD"),
        x509.NameAttribute(NameOID.COMMON_NAME, "APEX Root CA v1"),
    ])
    
    now = datetime.datetime.now(datetime.timezone.utc)
    ca_cert = x509.CertificateBuilder().subject_name(
        ca_name
    ).issuer_name(
        ca_name
    ).public_key(
        ca_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        now
    ).not_valid_after(
        now + datetime.timedelta(days=3650)
    ).add_extension(
        x509.BasicConstraints(ca=True, path_length=None), critical=True
    ).sign(ca_key, SHA256())

    # 2. Generate Device Ed25519 key-pair
    device_key = ed25519.Ed25519PrivateKey.generate()
    device_name = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "CA"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Alberta"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "APEX Business Systems LTD"),
        x509.NameAttribute(NameOID.COMMON_NAME, device_serial),
    ])

    device_cert = x509.CertificateBuilder().subject_name(
        device_name
    ).issuer_name(
        ca_name
    ).public_key(
        device_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        now
    ).not_valid_after(
        now + datetime.timedelta(days=365)
    ).add_extension(
        x509.BasicConstraints(ca=False, path_length=None), critical=True
    ).sign(ca_key, SHA256())

    # Serialize PEM files
    ca_pem = ca_cert.public_bytes(serialization.Encoding.PEM)
    client_pem = device_cert.public_bytes(serialization.Encoding.PEM)
    client_key = device_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    fingerprint = x509.Certificate.fingerprint(device_cert, SHA256()).hex()

    return ca_pem, client_pem, client_key, fingerprint


def register_device_in_supabase(device_serial: str, device_id: str):
    """Upsert active node record directly into Supabase via REST API."""
    if not SUPABASE_KEY:
        print("SUPABASE_SERVICE_ROLE_KEY not configured. Skipping active database update.")
        return False
    if not SUPABASE_URL:
        print("SUPABASE_URL not configured. Skipping active database update.")
        return False

    tenant_id = require_uuid_env("PHYSIOMNI_TENANT_ID", TENANT_ID)
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/physiomni_devices"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    payload = {
        "id": device_id,
        "device_serial": device_serial,
        "tenant_id": tenant_id,
        "is_active": True,
        "registered_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    req = urllib.request.Request(
        url, 
        data=json.dumps(payload).encode("utf-8"), 
        headers=headers, 
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            if status_code in (200, 201):
                print(f"Successfully registered node {device_serial} in database.")
                return True
    except Exception as e:
        print(f"Database registration failed: {e}")
    return False


def generate_flashing_script(ca_pem: bytes, client_pem: bytes, client_key: bytes):
    """Write generated keys to local files and generate J-Link flash script."""
    cert_dir = "tools/provisioning/certs"
    os.makedirs(cert_dir, exist_ok=True)

    ca_path = os.path.join(cert_dir, "ca.pem")
    client_path = os.path.join(cert_dir, "client.pem")
    key_path = os.path.join(cert_dir, "client.key")

    with open(ca_path, "wb") as f:
        f.write(ca_pem)
    with open(client_path, "wb") as f:
        f.write(client_pem)
    with open(key_path, "wb") as f:
        f.write(client_key)

    script_path = "tools/provisioning/flash_certs.sh"
    
    # Generate robust nrfutil flash CLI command scripts
    script_content = f"""#!/usr/bin/env bash
# APEX AegisKernel Physical Hardware Credential Flash Script
# Targets: Nordic nRF9161 modem secure element
set -euo pipefail

PORT_NAME="${{1:-/dev/ttyACM0}}"
SEC_TAG={SEC_TAG}

echo "=========================================================="
echo "APEX AegisKernel: Injecting credentials into nRF9161..."
echo "Target Port: ${{PORT_NAME}}"
echo "Secure Tag:  ${{SEC_TAG}}"
echo "=========================================================="

if ! command -v nrfutil &> /dev/null; then
    echo "Warning: 'nrfutil' CLI not detected."
    echo "Falling back to direct AT command flashing via serial..."
    
    # Format raw AT commands to write via echo to serial port
    echo "Writing CA Certificate..."
    echo -e "AT%WSECWRITE=${{SEC_TAG}},0,1,\\"$(cat {ca_path})\\"\\r" > "${{PORT_NAME}}"
    sleep 1
    
    echo "Writing Client Certificate..."
    echo -e "AT%WSECWRITE=${{SEC_TAG}},1,1,\\"$(cat {client_path})\\"\\r" > "${{PORT_NAME}}"
    sleep 1
    
    echo "Writing Private Client Key..."
    echo -e "AT%WSECWRITE=${{SEC_TAG}},2,1,\\"$(cat {key_path})\\"\\r" > "${{PORT_NAME}}"
    sleep 1
    
    echo "Credential flash executed via AT commands."
else
    echo "Utilizing nrfutil modem credentials manager..."
    nrfutil modem credentials --port "${{PORT_NAME}}" \\
        --sec-tag ${{SEC_TAG}} \\
        --ca-cert "{ca_path}" \\
        --client-cert "{client_path}" \\
        --private-key "{key_path}"
    
    echo "mTLS credentials successfully pushed to nRF9161 J-Link secure enclave."
fi
"""
    with open(script_path, "w") as f:
        f.write(script_content)
    # AegisKernel: Restrict file permissions to owner-only for maximum security (CWE-732)
    import stat
    os.chmod(script_path, stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR)

    print(f"Generated flashing script: {script_path}")
    print(f"Stored node certificates under: {cert_dir}/")


def main():
    print("Starting APEX PhysiOmni Pilot Node Provisioning Sequence...")

    tenant_id = require_uuid_env("PHYSIOMNI_TENANT_ID", TENANT_ID)
    device_id = str(uuid4())
    device_serial = "DEV-NRF9161-001"

    # Step 1: Generate cryptographic mTLS certs
    ca_pem, client_pem, client_key, fingerprint = generate_ca_and_device_credentials(device_serial)
    print("Generated cryptographically secure credentials.")
    print(f"Client Certificate fingerprint: {fingerprint}")

    # Step 2: Register in Supabase database
    register_device_in_supabase(device_serial, device_id)

    # Step 3: Emit flash utility script for hardware technician
    generate_flashing_script(ca_pem, client_pem, client_key)

    # Step 4: Emit deployment technician metadata audit file
    audit_file = "tools/provisioning/provisioning_audit.json"
    audit_data = {
        "device_id": device_id,
        "device_serial": device_serial,
        "status": "active",
        "fingerprint": fingerprint,
        "secure_tag": SEC_TAG,
        "tenant_id": tenant_id,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    with open(audit_file, "w") as f:
        json.dump(audit_data, f, indent=4)

    print(f"Successfully generated provisioning audit logs in {audit_file}")
    print("Sequence completed successfully.")


if __name__ == "__main__":
    main()
