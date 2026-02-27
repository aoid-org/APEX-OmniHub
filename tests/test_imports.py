#!/usr/bin/env python3
"""
Test script to verify imports work correctly.
This script adds the orchestrator directory to the Python path and tests the imports.
"""

import sys
import os

# Add the orchestrator directory to the Python path
orchestrator_path = os.path.join(os.path.dirname(__file__), '..', 'orchestrator')
orchestrator_path = os.path.abspath(orchestrator_path)
print(f"Adding to sys.path: {orchestrator_path}")
print(f"Directory exists: {os.path.exists(orchestrator_path)}")
if os.path.exists(orchestrator_path):
    print(f"Files in orchestrator: {os.listdir(orchestrator_path)}")
if orchestrator_path not in sys.path:
    sys.path.insert(0, orchestrator_path)
    print(f"✓ Added {orchestrator_path} to sys.path")
else:
    print(f"✓ {orchestrator_path} already in sys.path")

# Test the imports
try:
    import pytest
    print("✓ pytest imported successfully")
except ImportError as e:
    print(f"✗ Failed to import pytest: {e}")

try:
    import temporalio.exceptions
    print("✓ temporalio.exceptions imported successfully")
except ImportError as e:
    print(f"✗ Failed to import temporalio.exceptions: {e}")

try:
    from orchestrator.activities.man_mode import create_man_task
    print("✓ orchestrator.activities.man_mode imported successfully")
except ImportError as e:
    print(f"✗ Failed to import orchestrator.activities.man_mode: {e}")

try:
    from orchestrator.activities.tools import extract_tenant_from_activity_input
    print("✓ orchestrator.activities.tools imported successfully")
except ImportError as e:
    print(f"✗ Failed to import orchestrator.activities.tools: {e}")

print("\nAll imports tested!")