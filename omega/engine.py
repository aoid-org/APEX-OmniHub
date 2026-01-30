"""
APEX Resilience Protocol - Verification Engine
Core verification logic for human-in-the-loop approvals

Security: Proper data handling for XSS prevention (SonarQube S5131 compliant)
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, TypedDict


class VerificationRequest(TypedDict):
    """Verification request data structure"""
    request_id: str
    task_description: str
    modified_files: list[str]
    evidence_path: str
    submitted_at: str
    status: str


class VerificationResult(TypedDict):
    """Verification result data structure"""
    request_id: str
    status: str
    approved_by: str
    approved_at: str
    rejection_reason: str


class VerificationEngine:
    """
    Verification engine for APEX Resilience Protocol.

    Handles approval/rejection workflow for AI-generated code changes.
    Data is expected to be pre-sanitized by the dashboard layer.
    """

    def __init__(self, storage_path: str = "/tmp/apex-evidence"):
        """
        Initialize verification engine.

        Args:
            storage_path: Path to evidence storage directory
        """
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.pending_file = self.storage_path / "pending-requests.json"
        self.approvals_dir = self.storage_path / "approvals"
        self.approvals_dir.mkdir(exist_ok=True)

        # Initialize pending requests file if it doesn't exist
        if not self.pending_file.exists():
            self.pending_file.write_text("{}")

    def create_verification_request(
        self,
        request_id: str,
        task_description: str,
        modified_files: list[str],
        evidence_path: str
    ) -> VerificationRequest:
        """
        Create a new verification request.

        Args:
            request_id: Unique request identifier
            task_description: Description of the task
            modified_files: List of files modified
            evidence_path: Path to verification evidence

        Returns:
            Created verification request
        """
        # Use timezone-aware datetime (SonarQube S6978 compliance)
        submitted_at = datetime.now(timezone.utc).isoformat()

        request: VerificationRequest = {
            'request_id': request_id,
            'task_description': task_description,
            'modified_files': modified_files,
            'evidence_path': evidence_path,
            'submitted_at': submitted_at,
            'status': 'pending'
        }

        # Add to pending requests
        pending = self._load_pending()
        pending[request_id] = request
        self._save_pending(pending)

        return request

    def approve_request(
        self,
        request_id: str,
        approved_by: str
    ) -> VerificationResult:
        """
        Approve a verification request.

        Args:
            request_id: Request to approve
            approved_by: Username of approver (pre-sanitized)

        Returns:
            Approval result

        Raises:
            ValueError: If request not found
        """
        pending = self._load_pending()
        if request_id not in pending:
            raise ValueError(f"Request {request_id} not found")

        # Use timezone-aware datetime (SonarQube S6978 compliance)
        approved_at = datetime.now(timezone.utc).isoformat()

        # SECURITY NOTE: approved_by is expected to be pre-sanitized
        # by the dashboard layer (escape_html applied)
        result: VerificationResult = {
            'request_id': request_id,
            'status': 'approved',
            'approved_by': approved_by,
            'approved_at': approved_at,
            'rejection_reason': ''
        }

        # Remove from pending and save approval
        del pending[request_id]
        self._save_pending(pending)
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
            request_id: Request to reject
            rejected_by: Username of rejector (pre-sanitized)
            reason: Rejection reason (pre-sanitized)

        Returns:
            Rejection result

        Raises:
            ValueError: If request not found
        """
        pending = self._load_pending()
        if request_id not in pending:
            raise ValueError(f"Request {request_id} not found")

        # Use timezone-aware datetime (SonarQube S6978 compliance)
        rejected_at = datetime.now(timezone.utc).isoformat()

        # SECURITY NOTE: All user-controlled data (rejected_by, reason)
        # is expected to be pre-sanitized by the dashboard layer
        # (escape_html applied before passing to this method)
        result: VerificationResult = {
            'request_id': request_id,
            'status': 'rejected',
            'approved_by': rejected_by,  # Reuse field for rejector
            'approved_at': rejected_at,
            'rejection_reason': reason
        }

        # Remove from pending and save rejection
        del pending[request_id]
        self._save_pending(pending)
        self._save_approval(request_id, result)

        return result

    def get_pending_requests(self) -> Dict[str, VerificationRequest]:
        """
        Get all pending verification requests.

        Returns:
            Dictionary of pending requests
        """
        return self._load_pending()

    def get_approval(self, request_id: str) -> VerificationResult | None:
        """
        Get approval/rejection result for a request.

        Args:
            request_id: Request ID to look up

        Returns:
            Verification result if found, None otherwise
        """
        approval_file = self.approvals_dir / f"{request_id}.json"
        if not approval_file.exists():
            return None

        with open(approval_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _load_pending(self) -> Dict[str, VerificationRequest]:
        """Load pending requests from storage"""
        with open(self.pending_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _save_pending(self, pending: Dict[str, VerificationRequest]) -> None:
        """Save pending requests to storage"""
        with open(self.pending_file, 'w', encoding='utf-8') as f:
            json.dump(pending, f, indent=2)

    def _save_approval(self, request_id: str, result: VerificationResult) -> None:
        """Save approval/rejection result"""
        approval_file = self.approvals_dir / f"{request_id}.json"
        with open(approval_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)


def demo_workflow() -> None:
    """Demonstrate verification workflow"""
    engine = VerificationEngine()

    # Create a verification request
    request = engine.create_verification_request(
        request_id='task-demo-001',
        task_description='Refactor authentication module',
        modified_files=['src/auth/login.ts', 'src/auth/session.ts'],
        evidence_path='/tmp/apex-evidence/task-demo-001.json'
    )

    print(f"Created request: {request['request_id']}")
    print(f"Status: {request['status']}")

    # Simulate approval (in real usage, this comes from HTTP API)
    result = engine.approve_request(
        request_id='task-demo-001',
        approved_by='admin@apex.local'
    )

    print(f"\nApproval result:")
    print(f"  Status: {result['status']}")
    print(f"  Approved by: {result['approved_by']}")
    print(f"  Approved at: {result['approved_at']}")


if __name__ == '__main__':
    demo_workflow()
