#!/usr/bin/env python3
"""
Protocol Omega Demo - Zero-Dependency Verification System
Demonstrates the full approval workflow
"""

import sys
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import OmegaEngine


def print_banner(text: str):
    """Print formatted banner"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70 + "\n")


def demo_basic_workflow():
    """Demonstrate basic approval workflow"""
    print_banner("Demo 1: Basic Approval Workflow")

    engine = OmegaEngine()

    # Step 1: Request approval for a high-risk operation
    print("📝 Requesting approval for HIGH risk operation...")
    result = engine.request_approval(
        intent="DROP TABLE production_users",
        risk_level="HIGH",
        context={"database": "production", "table": "users"}
    )

    print(f"   Status: {result['status']}")
    print(f"   Task Hash: {result['task_hash']}")
    print(f"   Short Hash: {result['short_hash']}")
    print(f"\n   To approve: python3 omega/engine.py approve {result['short_hash']}")

    # Step 2: Check approval status (should be PENDING)
    print("\n🔍 Checking approval status...")
    check = engine.check_approval("DROP TABLE production_users")
    print(f"   Approved: {check['approved']}")
    print(f"   Status: {check['status']}")

    # Step 3: Simulate approval
    print(f"\n✅ Approving task {result['short_hash']}...")
    approve_result = engine.approve(result['short_hash'], approved_by="demo")

    if approve_result['success']:
        print(f"   ✓ Task approved successfully")
        print(f"   Approved at: {approve_result['approved_at']}")
    else:
        print(f"   ✗ Approval failed: {approve_result.get('error')}")

    # Step 4: Verify approval
    print("\n🔍 Re-checking approval status...")
    check = engine.check_approval("DROP TABLE production_users")
    print(f"   Approved: {check['approved']}")
    print(f"   Status: {check['status']}")

    if check['approved']:
        print("\n🚀 Operation would now execute (approved)")
    else:
        print("\n⚠️  Operation blocked (not approved)")


def demo_risk_levels():
    """Demonstrate different risk levels"""
    print_banner("Demo 2: Risk Level Classification")

    engine = OmegaEngine()

    operations = [
        ("Read user profile data", "LOW"),
        ("Update user preferences", "MEDIUM"),
        ("Delete all user data", "HIGH"),
    ]

    for intent, risk in operations:
        print(f"\n📋 {risk} Risk: {intent}")
        result = engine.request_approval(intent, risk)
        print(f"   Short Hash: {result['short_hash']}")


def demo_rejection():
    """Demonstrate rejection workflow"""
    print_banner("Demo 3: Rejection Workflow")

    engine = OmegaEngine()

    print("📝 Requesting approval for suspicious operation...")
    result = engine.request_approval(
        intent="Send production data to external API",
        risk_level="HIGH",
        context={"destination": "unknown-api.example.com"}
    )

    print(f"   Short Hash: {result['short_hash']}")

    print(f"\n❌ Rejecting task {result['short_hash']}...")
    reject_result = engine.reject(result['short_hash'], "Unauthorized data transfer")

    if reject_result['success']:
        print("   ✓ Task rejected successfully")


def demo_batch_approvals():
    """Demonstrate batch approval listing"""
    print_banner("Demo 4: Batch Approval Management")

    engine = OmegaEngine()

    # Create multiple pending approvals
    print("📝 Creating multiple pending approvals...\n")

    operations = [
        ("Modify database schema", "MEDIUM"),
        ("Export customer data", "HIGH"),
        ("Update configuration file", "LOW"),
    ]

    for intent, risk in operations:
        result = engine.request_approval(intent, risk)
        print(f"   [{risk:6}] {result['short_hash']} - {intent}")

    # List all pending
    print("\n📋 Listing all pending approvals...")
    pending = engine.list_pending()

    print(f"\n   Total pending: {len(pending)}")
    for item in pending:
        print(f"   - {item['short_hash']}: {item['intent']} ({item['risk_level']})")


def demo_statistics():
    """Show system statistics"""
    print_banner("Demo 5: System Statistics")

    engine = OmegaEngine()

    stats = engine.get_stats()

    print("📊 Protocol Omega Statistics:\n")
    print(f"   Pending:    {stats['pending']}")
    print(f"   Approved:   {stats['approved']}")
    print(f"   Rejected:   {stats['rejected']}")
    print(f"   Total Audits: {stats['total_audits']}")

    total = stats['pending'] + stats['approved'] + stats['rejected']
    if total > 0:
        print(f"\n   Total Verifications: {total}")
        print(f"   Approval Rate: {stats['approved'] / total * 100:.1f}%")


def demo_idempotency():
    """Demonstrate deterministic hashing"""
    print_banner("Demo 6: Idempotent Verification")

    engine = OmegaEngine()

    intent = "Test idempotency operation"

    print("📝 Requesting approval for same operation twice...\n")

    # First request
    result1 = engine.request_approval(intent, "LOW")
    print(f"   Request 1: {result1['short_hash']} (exists: {result1.get('exists', False)})")

    # Second request (should return existing)
    result2 = engine.request_approval(intent, "LOW")
    print(f"   Request 2: {result2['short_hash']} (exists: {result2.get('exists', False)})")

    print(f"\n   Same hash: {result1['task_hash'] == result2['task_hash']}")
    print("   ✓ Verification is idempotent")


def main():
    """Run all demos"""
    print("""
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║              Protocol Omega - Interactive Demo                   ║
║         Zero-Dependency State-Gated Verification System           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    """)

    demos = [
        ("Basic Workflow", demo_basic_workflow),
        ("Risk Levels", demo_risk_levels),
        ("Rejection", demo_rejection),
        ("Batch Management", demo_batch_approvals),
        ("Statistics", demo_statistics),
        ("Idempotency", demo_idempotency),
    ]

    if len(sys.argv) > 1:
        # Run specific demo
        demo_num = int(sys.argv[1])
        if 1 <= demo_num <= len(demos):
            demos[demo_num - 1][1]()
        else:
            print(f"❌ Invalid demo number. Choose 1-{len(demos)}")
            sys.exit(1)
    else:
        # Run all demos
        for name, demo_func in demos:
            demo_func()
            time.sleep(1)  # Pause between demos

        print_banner("Demo Complete")
        print("🎉 All demos executed successfully!")
        print("\nNext steps:")
        print("  - Start dashboard: npm run omega:dashboard")
        print("  - View statistics: npm run omega:stats")
        print("  - List pending: npm run omega:list")
        print("\nDatabase location: ~/.apex/omega/verification.db")


if __name__ == "__main__":
    main()
