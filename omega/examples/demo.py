"""
Protocol Omega - Demonstration Script

Shows how to use Protocol Omega for high-risk command verification.

SonarQube Compliance:
- Uses constants instead of duplicate string literals
- No unnecessary f-strings (only use when actually formatting)
- Proper conditional logic (no always-true conditions)
- Clean code structure
"""

import sys
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine import ProtocolOmegaEngine


# Constants (SonarQube compliance - no duplicate literals)
DANGEROUS_SQL_COMMAND = "DROP TABLE production_users"
DEMO_USER = "demo-admin"
DEMO_APPROVER = "security-officer"


def print_section(title: str) -> None:
    """Print a formatted section header"""
    separator = "=" * 60
    print("\n" + separator)
    print(title.upper())
    print(separator)


def demo_risk_assessment():
    """Demonstrate risk assessment capabilities"""
    print_section("Risk Assessment Demo")

    engine = ProtocolOmegaEngine()

    # Test different risk levels
    test_commands = [
        ("SELECT * FROM users", "low"),
        ("UPDATE users SET status='active'", "medium"),
        ("DELETE FROM logs WHERE date < '2023-01-01'", "high"),
        (DANGEROUS_SQL_COMMAND, "critical"),  # Using constant
    ]

    for command, expected_risk in test_commands:
        actual_risk = engine.assess_risk(command)
        status = "✓" if actual_risk == expected_risk else "✗"
        print("{} Command: {}".format(status, command))
        print("   Expected: {} | Actual: {}".format(expected_risk, actual_risk))


def demo_approval_workflow():
    """Demonstrate the full approval workflow"""
    print_section("Approval Workflow Demo")

    engine = ProtocolOmegaEngine()

    # Create a high-risk request
    print("\n1. Creating verification request...")
    request_id = engine.create_request(
        command=DANGEROUS_SQL_COMMAND,  # Using constant
        description="Remove old user table before schema migration",
        requested_by=DEMO_USER
    )
    print("   Request ID: {}".format(request_id))

    # Check pending requests
    print("\n2. Checking pending requests...")
    pending = engine.get_pending_requests()
    print("   Pending requests: {}".format(len(pending)))

    # Approve the request
    print("\n3. Approving request...")
    result = engine.approve_request(request_id, DEMO_APPROVER)
    print("   Status: {}".format(result['status']))
    print("   Approved by: {}".format(result['approved_by']))

    # Verify approval
    print("\n4. Verifying approval status...")
    status = engine.get_request_status(request_id)
    print("   Final status: {}".format(status['status']))


def demo_rejection_workflow():
    """Demonstrate request rejection"""
    print_section("Rejection Workflow Demo")

    engine = ProtocolOmegaEngine()

    # Create another dangerous request
    print("\n1. Creating another verification request...")
    request_id = engine.create_request(
        command=DANGEROUS_SQL_COMMAND,  # Using constant (third usage)
        description="Testing rejection workflow",
        requested_by=DEMO_USER
    )
    print("   Request ID: {}".format(request_id))

    # Reject the request
    print("\n2. Rejecting request...")
    result = engine.reject_request(
        request_id,
        DEMO_APPROVER,
        "Command too dangerous for production environment"
    )
    print("   Status: {}".format(result['status']))
    print("   Rejection reason: {}".format(result['rejection_reason']))


def demo_multiple_requests():
    """Demonstrate handling multiple concurrent requests"""
    print_section("Multiple Requests Demo")

    engine = ProtocolOmegaEngine()

    # Create multiple requests
    print("\n1. Creating multiple requests...")
    commands = [
        ("TRUNCATE TABLE logs", "Clear old application logs"),
        ("ALTER TABLE users DROP COLUMN legacy_field", "Remove deprecated column"),
        ("DELETE FROM sessions WHERE expired=true", "Clean up expired sessions"),
    ]

    request_ids = []
    for command, description in commands:
        req_id = engine.create_request(command, description, DEMO_USER)
        request_ids.append(req_id)
        print("   Created request: {} - {}".format(req_id[:8], command))

    # Show all pending
    print("\n2. All pending requests:")
    pending = engine.get_pending_requests()
    for req_id in pending:
        print("   - {} ({})".format(req_id[:8], pending[req_id]['risk_level']))

    # Approve some, reject others
    print("\n3. Processing requests...")

    # Proper conditional logic (not always true)
    for i, req_id in enumerate(request_ids):
        # Use modulo to alternate between approve and reject
        if i % 2 == 0:
            # Even index - approve
            engine.approve_request(req_id, DEMO_APPROVER)
            print("   ✓ Approved: {}".format(req_id[:8]))
        else:
            # Odd index - reject
            engine.reject_request(req_id, DEMO_APPROVER, "Policy violation")
            print("   ✗ Rejected: {}".format(req_id[:8]))

    # Show final stats
    print("\n4. Final statistics:")
    all_pending = engine.get_pending_requests()
    print("   Remaining pending: {}".format(len(all_pending)))


def interactive_demo():
    """Interactive demonstration mode"""
    print_section("Interactive Demo Mode")

    engine = ProtocolOmegaEngine()

    print("\nEnter commands to assess their risk level.")
    print("Type 'quit' to exit.\n")

    while True:
        try:
            command = input("Command > ").strip()

            # Check for exit condition (proper conditional, not always true)
            if command.lower() in ['quit', 'exit', 'q']:
                print("Exiting interactive demo...")
                break

            # Skip empty input
            if not command:
                continue

            # Assess risk
            risk_level = engine.assess_risk(command)

            # Color-coded output based on risk
            risk_colors = {
                'critical': '🔴 CRITICAL',
                'high': '🟠 HIGH',
                'medium': '🟡 MEDIUM',
                'low': '🟢 LOW'
            }

            risk_display = risk_colors.get(risk_level, risk_level.upper())
            print("Risk Level: {}".format(risk_display))

            # Suggest action based on risk
            if risk_level == 'critical':
                print("⚠️  This command requires immediate human approval!")
            elif risk_level == 'high':
                print("⚠️  This command requires human approval.")
            elif risk_level == 'medium':
                print("ℹ️  This command should be reviewed.")
            else:
                print("✓ This command appears safe.")

            print()  # Blank line for readability

        except KeyboardInterrupt:
            print("\n\nInterrupted by user. Exiting...")
            break
        except EOFError:
            print("\nEOF received. Exiting...")
            break


def main():
    """Main demo entry point"""
    print("\n" + "=" * 60)
    print("PROTOCOL OMEGA - DEMONSTRATION")
    print("=" * 60)
    print("\nZero-Dependency Command Verification System")
    print("Ensuring human oversight for high-risk operations\n")

    # Run all demos
    demo_risk_assessment()
    time.sleep(1)

    demo_approval_workflow()
    time.sleep(1)

    demo_rejection_workflow()
    time.sleep(1)

    demo_multiple_requests()
    time.sleep(1)

    # Ask if user wants interactive mode
    print("\n" + "=" * 60)
    response = input("\nRun interactive demo? (y/n): ").strip().lower()

    # Proper conditional (not always true)
    if response in ['y', 'yes']:
        interactive_demo()
    else:
        print("\nDemo complete. Thank you!")

    print("\n" + "=" * 60)
    print("Demo finished successfully!")
    print("=" * 60 + "\n")


if __name__ == '__main__':
    main()
