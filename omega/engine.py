"""
Protocol Omega - Zero-Dependency Verification Engine

A lightweight command verification system for high-risk operations.
Ensures human approval before executing dangerous commands.

SonarQube Compliance:
- Uses timezone-aware datetime.now(timezone.utc) instead of deprecated utcnow()
- Cognitive complexity kept under 15 for all functions
- All exceptions properly specified
- No security vulnerabilities
"""

import json
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, TypedDict


class VerificationRequest(TypedDict):
    """Type definition for verification request"""
    command: str
    description: str
    risk_level: str
    requested_by: str
    timestamp: str


class VerificationResult(TypedDict):
    """Type definition for verification result"""
    request_id: str
    status: str
    approved_by: Optional[str]
    approved_at: Optional[str]
    rejection_reason: Optional[str]


class ProtocolOmegaEngine:
    """
    Core verification engine for Protocol Omega.

    Handles:
    - Risk assessment of commands
    - Approval workflow management
    - Audit trail generation
    """

    # High-risk command patterns
    DANGEROUS_PATTERNS = [
        r'\bDROP\s+TABLE\b',
        r'\bDELETE\s+FROM\b.*\bWHERE\s+1\s*=\s*1\b',
        r'\brm\s+-rf\b',
        r'\bsudo\b.*\brm\b',
        r'\bDROP\s+DATABASE\b',
        r'\bTRUNCATE\b',
        r'\bALTER\s+TABLE\b.*\bDROP\b',
    ]

    def __init__(self, data_dir: Optional[Path] = None):
        """
        Initialize the engine.

        Args:
            data_dir: Directory for storing verification data (default: ./omega/data)
        """
        self.data_dir = data_dir or Path(__file__).parent / 'data'
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.requests_file = self.data_dir / 'requests.json'
        self.approvals_file = self.data_dir / 'approvals.json'

    def assess_risk(self, command: str) -> str:
        """
        Assess the risk level of a command.

        Args:
            command: The command to assess

        Returns:
            Risk level: 'critical', 'high', 'medium', or 'low'
        """
        command_upper = command.upper()

        # Check for critical patterns
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, command_upper, re.IGNORECASE):
                return 'critical'

        # Check for high-risk keywords
        high_risk_keywords = ['DELETE', 'DROP', 'TRUNCATE', 'SHUTDOWN', 'KILL']
        if any(keyword in command_upper for keyword in high_risk_keywords):
            return 'high'

        # Check for medium-risk keywords
        medium_risk_keywords = ['UPDATE', 'INSERT', 'ALTER', 'CREATE', 'GRANT']
        if any(keyword in command_upper for keyword in medium_risk_keywords):
            return 'medium'

        return 'low'

    def create_request(
        self,
        command: str,
        description: str,
        requested_by: str
    ) -> str:
        """
        Create a new verification request.

        Args:
            command: The command to verify
            description: Description of what the command does
            requested_by: Username of requester

        Returns:
            Request ID (SHA-256 hash)
        """
        # Use timezone-aware datetime (SonarQube S6978 compliance)
        timestamp = datetime.now(timezone.utc).isoformat()

        # Generate unique request ID
        request_data = f"{command}:{timestamp}:{requested_by}"
        request_id = hashlib.sha256(request_data.encode()).hexdigest()[:16]

        # Assess risk
        risk_level = self.assess_risk(command)

        # Create request object
        request: VerificationRequest = {
            'command': command,
            'description': description,
            'risk_level': risk_level,
            'requested_by': requested_by,
            'timestamp': timestamp
        }

        # Save request
        self._save_request(request_id, request)

        return request_id

    def approve_request(
        self,
        request_id: str,
        approved_by: str
    ) -> VerificationResult:
        """
        Approve a verification request.

        Args:
            request_id: The request ID to approve
            approved_by: Username of approver

        Returns:
            Verification result

        Raises:
            ValueError: If request not found or invalid
        """
        request = self._load_request(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")

        # Use timezone-aware datetime (SonarQube S6978 compliance)
        approved_at = datetime.now(timezone.utc).isoformat()

        result: VerificationResult = {
            'request_id': request_id,
            'status': 'approved',
            'approved_by': approved_by,
            'approved_at': approved_at,
            'rejection_reason': None
        }

        self._save_approval(request_id, result)
        return result

    def reject_request(
        self,
        request_id: str,
        rejected_by: str,
        reason: str
    ) -> VerificationResult:
        """
        Reject a verification request.

        Args:
            request_id: The request ID to reject
            rejected_by: Username of rejector
            reason: Reason for rejection

        Returns:
            Verification result

        Raises:
            ValueError: If request not found
        """
        request = self._load_request(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")

        # Use timezone-aware datetime (SonarQube S6978 compliance)
        rejected_at = datetime.now(timezone.utc).isoformat()

        result: VerificationResult = {
            'request_id': request_id,
            'status': 'rejected',
            'approved_by': rejected_by,
            'approved_at': rejected_at,
            'rejection_reason': reason
        }

        self._save_approval(request_id, result)
        return result

    def get_pending_requests(self) -> Dict[str, VerificationRequest]:
        """
        Get all pending verification requests.

        Returns:
            Dictionary of request_id -> request data
        """
        all_requests = self._load_all_requests()
        approvals = self._load_all_approvals()

        # Filter out approved/rejected requests
        pending = {
            req_id: req_data
            for req_id, req_data in all_requests.items()
            if req_id not in approvals
        }

        return pending

    def get_request_status(self, request_id: str) -> Dict[str, object]:
        """
        Get the status of a specific request.

        Args:
            request_id: The request ID to check

        Returns:
            Status dictionary with request and approval info

        Raises:
            ValueError: If request not found
        """
        request = self._load_request(request_id)
        if not request:
            raise ValueError(f"Request {request_id} not found")

        approval = self._load_approval(request_id)

        return {
            'request': request,
            'approval': approval,
            'status': approval['status'] if approval else 'pending'
        }

    def _save_request(self, request_id: str, request: VerificationRequest) -> None:
        """Save a request to storage"""
        all_requests = self._load_all_requests()
        all_requests[request_id] = request

        with open(self.requests_file, 'w', encoding='utf-8') as f:
            json.dump(all_requests, f, indent=2)

    def _load_request(self, request_id: str) -> Optional[VerificationRequest]:
        """Load a specific request"""
        all_requests = self._load_all_requests()
        return all_requests.get(request_id)

    def _load_all_requests(self) -> Dict[str, VerificationRequest]:
        """Load all requests"""
        if not self.requests_file.exists():
            return {}

        with open(self.requests_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _save_approval(self, request_id: str, result: VerificationResult) -> None:
        """Save an approval/rejection"""
        all_approvals = self._load_all_approvals()
        all_approvals[request_id] = result

        with open(self.approvals_file, 'w', encoding='utf-8') as f:
            json.dump(all_approvals, f, indent=2)

    def _load_approval(self, request_id: str) -> Optional[VerificationResult]:
        """Load a specific approval"""
        all_approvals = self._load_all_approvals()
        return all_approvals.get(request_id)

    def _load_all_approvals(self) -> Dict[str, VerificationResult]:
        """Load all approvals"""
        if not self.approvals_file.exists():
            return {}

        with open(self.approvals_file, 'r', encoding='utf-8') as f:
            return json.load(f)


def handle_assess(engine: ProtocolOmegaEngine, args: List[str]) -> None:
    """Handle assess command"""
    import sys
    if len(args) < 3:
        print("Usage: python3 engine.py assess <command>")
        sys.exit(1)
    risk = engine.assess_risk(args[2])
    print(json.dumps({'risk_level': risk}))


def handle_create(engine: ProtocolOmegaEngine, args: List[str]) -> None:
    """Handle create command"""
    import sys
    if len(args) < 5:
        print("Usage: python3 engine.py create <command> <description> <user>")
        sys.exit(1)
    request_id = engine.create_request(args[2], args[3], args[4])
    print(json.dumps({'request_id': request_id}))


def handle_pending(engine: ProtocolOmegaEngine) -> None:
    """Handle pending command"""
    pending = engine.get_pending_requests()
    print(json.dumps(pending, indent=2))


def handle_status(engine: ProtocolOmegaEngine, args: List[str]) -> None:
    """Handle status command"""
    import sys
    if len(args) < 3:
        print("Usage: python3 engine.py status <request_id>")
        sys.exit(1)
    try:
        status = engine.get_request_status(args[2])
        print(json.dumps(status, indent=2))
    except ValueError as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


def handle_approve(engine: ProtocolOmegaEngine, args: List[str]) -> None:
    """Handle approve command"""
    import sys
    if len(args) < 4:
        print("Usage: python3 engine.py approve <request_id> <approver>")
        sys.exit(1)
    try:
        result = engine.approve_request(args[2], args[3])
        print(json.dumps(result, indent=2))
    except ValueError as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


def handle_reject(engine: ProtocolOmegaEngine, args: List[str]) -> None:
    """Handle reject command"""
    import sys
    if len(args) < 5:
        print("Usage: python3 engine.py reject <request_id> <rejector> <reason>")
        sys.exit(1)
    try:
        result = engine.reject_request(args[2], args[3], args[4])
        print(json.dumps(result, indent=2))
    except ValueError as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


def main():
    """
    CLI entry point for the engine
    Reduced cognitive complexity by extracting command handlers
    """
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 engine.py <command> [args...]")
        sys.exit(1)

    engine = ProtocolOmegaEngine()
    command = sys.argv[1]

    # Dispatch to appropriate handler
    if command == 'assess':
        handle_assess(engine, sys.argv)
    elif command == 'create':
        handle_create(engine, sys.argv)
    elif command == 'pending':
        handle_pending(engine)
    elif command == 'status':
        handle_status(engine, sys.argv)
    elif command == 'approve':
        handle_approve(engine, sys.argv)
    elif command == 'reject':
        handle_reject(engine, sys.argv)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == '__main__':
    main()
