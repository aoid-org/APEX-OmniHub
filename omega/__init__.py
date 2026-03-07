"""
APEX Resilience Protocol - Omega Module
Human-in-the-loop verification system

This module provides:
- VerificationEngine: Core approval/rejection logic
- VerificationDashboard: HTTP API for human reviewers

Security: XSS-safe implementation (SonarQube S5131 compliant)
"""

from omega.engine import VerificationEngine, VerificationRequest, VerificationResult
from omega.dashboard import start_dashboard

__all__ = [
    'VerificationEngine',
    'VerificationRequest',
    'VerificationResult',
    'start_dashboard',
]

__version__ = '1.0.0'
