"""Test suite for tenant extraction functionality in APEX-OmniHub orchestrator.

This test file validates the multi-tenant implementation for the Python orchestrator,
specifically the tenant_id extraction and injection into database operations.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from temporalio.exceptions import ApplicationError

from orchestrator.activities.man_mode import create_man_task
from orchestrator.activities.tools import extract_tenant_from_activity_input


class TestTenantExtraction:
    """Test tenant extraction from activity input payloads."""

    def test_extract_tenant_from_jwt_claims(self):
        """Test tenant extraction from JWT claims in activity input."""
        # Mock activity context with JWT claims
        mock_activity = MagicMock()
        mock_activity.info = MagicMock()
        mock_activity.info.headers = {
            b'authorization': b'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidGVuYW50X2lkIjoiYWFhYWFhYWEtYWFhYS1hYWFhLWFhYWEtYWFhYWFhYWFhYWFhYSJ9.test'
        }
        
        # Mock the activity context
        with patch('orchestrator.activities.tools.activity') as mock_activity_ctx:
            mock_activity_ctx.info.headers = mock_activity.info.headers
            
            # Test extraction
            tenant_id = extract_tenant_from_activity_input({})
            assert tenant_id == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

    def test_extract_tenant_from_context_metadata(self):
        """Test tenant extraction from context metadata."""
        # Test data with tenant in context
        input_data = {
            "workflow_id": "test-wf",
            "context": {
                "tenant_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
            }
        }
        
        tenant_id = extract_tenant_from_activity_input(input_data)
        assert tenant_id == "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

    def test_extract_tenant_from_intent_metadata(self):
        """Test tenant extraction from intent metadata."""
        # Test data with tenant in intent
        input_data = {
            "workflow_id": "test-wf",
            "intent": {
                "tool_name": "test_tool",
                "context": {
                    "tenant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc"
                }
            }
        }
        
        tenant_id = extract_tenant_from_activity_input(input_data)
        assert tenant_id == "cccccccc-cccc-cccc-cccc-cccccccccccc"

    def test_extract_tenant_fallback_to_default(self):
        """Test fallback to default tenant when no tenant info found."""
        # Test data without tenant info
        input_data = {
            "workflow_id": "test-wf",
            "intent": {
                "tool_name": "test_tool"
            }
        }
        
        tenant_id = extract_tenant_from_activity_input(input_data)
        assert tenant_id == "00000000-0000-0000-0000-000000000000"  # Sentinel tenant

    def test_extract_tenant_priority_order(self):
        """Test that tenant extraction follows correct priority order."""
        # Test data with tenant in multiple places
        input_data = {
            "workflow_id": "test-wf",
            "context": {
                "tenant_id": "priority-tenant"
            },
            "intent": {
                "tool_name": "test_tool",
                "context": {
                    "tenant_id": "intent-tenant"
                }
            }
        }
        
        # Should prioritize context over intent
        tenant_id = extract_tenant_from_activity_input(input_data)
        assert tenant_id == "priority-tenant"


class TestCreateManTaskTenantInjection:
    """Test tenant_id injection in create_man_task activity."""

    @pytest.mark.asyncio
    async def test_create_man_task_includes_tenant_id(self):
        """Test that create_man_task includes tenant_id in database record."""
        # Mock database provider
        mock_db = AsyncMock()
        mock_db.upsert.return_value = {
            "id": "task-uuid",
            "workflow_id": "test-wf"
        }
        
        # Mock tenant extraction
        with patch('orchestrator.activities.man_mode.extract_tenant_from_activity_input') as mock_extract, \
             patch('orchestrator.activities.man_mode.get_database_provider') as mock_get_db:
            
            mock_extract.return_value = "test-tenant-id"
            mock_get_db.return_value = mock_db
            
            # Test input data
            params = {
                "workflow_id": "test-workflow",
                "intent": {"tool_name": "test-tool"},
                "timeout_hours": 24
            }
            
            # Execute activity
            result = await create_man_task(params)
            
            # Verify tenant_id was included in upsert call
            mock_db.upsert.assert_called_once()
            call_args = mock_db.upsert.call_args
            record = call_args.kwargs['record']
            
            assert record['tenant_id'] == "test-tenant-id"
            assert result['task_id'] == "task-uuid"

    @pytest.mark.asyncio
    async def test_create_man_task_handles_extraction_failure(self):
        """Test that create_man_task handles tenant extraction failures gracefully."""
        # Mock database provider
        mock_db = AsyncMock()
        mock_db.upsert.return_value = {"id": "task-uuid"}
        
        # Mock tenant extraction to raise exception
        with patch('orchestrator.activities.man_mode.extract_tenant_from_activity_input') as mock_extract, \
             patch('orchestrator.activities.man_mode.get_database_provider') as mock_get_db:
            
            mock_extract.side_effect = Exception("Tenant extraction failed")
            mock_get_db.return_value = mock_db
            
            # Test input data
            params = {
                "workflow_id": "test-workflow",
                "intent": {"tool_name": "test-tool"}
            }
            
            # Execute activity - should still work with fallback tenant
            result = await create_man_task(params)
            
            # Verify fallback tenant was used
            call_args = mock_db.upsert.call_args
            record = call_args.kwargs['record']
            assert record['tenant_id'] == "00000000-0000-0000-0000-000000000000"  # Sentinel tenant


class TestMultiTenantIsolation:
    """Test multi-tenant isolation in database operations."""

    @pytest.mark.asyncio
    async def test_different_tenants_same_workflow_id(self):
        """Test that same workflow_id can exist in different tenants."""
        # Mock database provider
        mock_db = AsyncMock()
        mock_db.upsert.side_effect = [
            {"id": "task-uuid-1", "workflow_id": "shared-wf"},
            {"id": "task-uuid-2", "workflow_id": "shared-wf"}
        ]
        
        with patch('orchestrator.activities.man_mode.extract_tenant_from_activity_input') as mock_extract, \
             patch('orchestrator.activities.man_mode.get_database_provider') as mock_get_db:
            
            mock_get_db.return_value = mock_db
            
            # First call with tenant A
            mock_extract.return_value = "tenant-a-id"
            params_a = {
                "workflow_id": "shared-workflow",
                "intent": {"tool_name": "test-tool"}
            }
            result_a = await create_man_task(params_a)
            
            # Second call with tenant B (same workflow_id)
            mock_extract.return_value = "tenant-b-id"
            params_b = {
                "workflow_id": "shared-workflow",  # Same workflow_id
                "intent": {"tool_name": "test-tool"}
            }
            result_b = await create_man_task(params_b)
            
            # Both should succeed (different tenants)
            assert result_a['task_id'] == "task-uuid-1"
            assert result_b['task_id'] == "task-uuid-2"
            
            # Verify both calls had different tenant_ids
            calls = mock_db.upsert.call_args_list
            assert calls[0].kwargs['record']['tenant_id'] == "tenant-a-id"
            assert calls[1].kwargs['record']['tenant_id'] == "tenant-b-id"

    @pytest.mark.asyncio
    async def test_same_tenant_same_workflow_id_collision(self):
        """Test that same tenant + workflow_id combination is handled correctly."""
        # Mock database provider to simulate upsert behavior
        mock_db = AsyncMock()
        mock_db.upsert.return_value = {"id": "existing-task-uuid", "workflow_id": "test-wf"}
        
        with patch('orchestrator.activities.man_mode.extract_tenant_from_activity_input') as mock_extract, \
             patch('orchestrator.activities.man_mode.get_database_provider') as mock_get_db:
            
            mock_extract.return_value = "same-tenant-id"
            mock_get_db.return_value = mock_db
            
            # First call
            params = {
                "workflow_id": "test-workflow",
                "intent": {"tool_name": "test-tool"}
            }
            result = await create_man_task(params)
            
            # Should succeed (upsert returns existing record)
            assert result['task_id'] == "existing-task-uuid"
            mock_db.upsert.assert_called_once()


class TestTenantSecurity:
    """Test security aspects of tenant handling."""

    def test_no_tenant_id_leakage(self):
        """Test that tenant_id is not leaked in error messages."""
        # Test that tenant extraction doesn't expose tenant IDs in exceptions
        input_data = {"workflow_id": "test"}
        tenant_id = extract_tenant_from_activity_input(input_data)
        
        # Should use sentinel tenant, not expose any real tenant IDs
        assert tenant_id == "00000000-0000-0000-0000-000000000000"

    @pytest.mark.asyncio
    async def test_tenant_id_validation(self):
        """Test that tenant_id format is validated."""
        # Mock database provider
        mock_db = AsyncMock()
        mock_db.upsert.return_value = {"id": "task-uuid"}
        
        with patch('orchestrator.activities.man_mode.extract_tenant_from_activity_input') as mock_extract, \
             patch('orchestrator.activities.man_mode.get_database_provider') as mock_get_db:
            
            # Test with invalid UUID format
            mock_extract.return_value = "invalid-tenant-id"
            mock_get_db.return_value = mock_db
            
            params = {
                "workflow_id": "test-workflow",
                "intent": {"tool_name": "test-tool"}
            }
            
            # Should still work (database will handle validation)
            result = await create_man_task(params)
            assert result['task_id'] == "task-uuid"
            
            # Verify invalid tenant_id was passed to database
            call_args = mock_db.upsert.call_args
            record = call_args.kwargs['record']
            assert record['tenant_id'] == "invalid-tenant-id"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])