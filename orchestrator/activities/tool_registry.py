from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ToolContract:
    canonical_name: str
    aliases: tuple[str, ...]
    side_effect: bool
    idempotency_required: bool
    compensable: bool
    compensation_tools_allowed: tuple[str, ...]
    default_lane: str
    policy_tags: tuple[str, ...]
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]


# Canonical source of truth for tools
TOOL_REGISTRY: dict[str, ToolContract] = {
    "search_database": ToolContract(
        canonical_name="search_database",
        aliases=(),
        side_effect=False,
        idempotency_required=False,
        compensable=False,
        compensation_tools_allowed=(),
        default_lane="GREEN",
        policy_tags=("db_read",),
        input_schema={
            "type": "object",
            "properties": {"table": {"type": "string"}, "query": {"type": "string"}},
        },
        output_schema={},
    ),
    "create_record": ToolContract(
        canonical_name="create_record",
        aliases=(),
        side_effect=True,
        idempotency_required=True,
        compensable=True,
        compensation_tools_allowed=("delete_record",),
        default_lane="YELLOW",
        policy_tags=("db_write",),
        input_schema={
            "type": "object",
            "properties": {"table": {"type": "string"}, "data": {"type": "object"}},
        },
        output_schema={},
    ),
    "delete_record": ToolContract(
        canonical_name="delete_record",
        aliases=(),
        side_effect=True,
        idempotency_required=True,
        compensable=False,
        compensation_tools_allowed=(),
        default_lane="RED",
        policy_tags=("db_write",),
        input_schema={
            "type": "object",
            "properties": {"table": {"type": "string"}, "id": {"type": "string"}},
        },
        output_schema={},
    ),
    "send_email": ToolContract(
        canonical_name="send_email",
        aliases=(),
        side_effect=True,
        idempotency_required=True,
        compensable=False,
        compensation_tools_allowed=(),
        default_lane="YELLOW",
        policy_tags=("external_comm",),
        input_schema={
            "type": "object",
            "properties": {
                "to": {"type": "string"},
                "subject": {"type": "string"},
                "body": {"type": "string"},
            },
        },
        output_schema={},
    ),
    "call_webhook": ToolContract(
        canonical_name="call_webhook",
        aliases=("webhook",),
        side_effect=True,
        idempotency_required=True,
        compensable=True,
        compensation_tools_allowed=("call_webhook",),
        default_lane="YELLOW",
        policy_tags=("external_api",),
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "method": {"type": "string"},
                "payload": {"type": "object"},
            },
        },
        output_schema={},
    ),
    "search_youtube": ToolContract(
        canonical_name="search_youtube",
        aliases=(),
        side_effect=False,
        idempotency_required=False,
        compensable=False,
        compensation_tools_allowed=(),
        default_lane="GREEN",
        policy_tags=("external_read",),
        input_schema={"type": "object", "properties": {"query": {"type": "string"}}},
        output_schema={},
    ),
    "respond_to_user": ToolContract(
        canonical_name="respond_to_user",
        aliases=("answer", "respond", "reply", "respond_directly"),
        side_effect=False,
        idempotency_required=False,
        compensable=False,
        compensation_tools_allowed=(),
        default_lane="GREEN",
        policy_tags=("conversational",),
        input_schema={
            "type": "object",
            "properties": {"message": {"type": "string"}},
            "required": ["message"],
        },
        output_schema={},
    ),
    "update_agent_run_completion": ToolContract(
        canonical_name="update_agent_run_completion",
        aliases=(),
        side_effect=True,
        idempotency_required=True,
        compensable=False,
        compensation_tools_allowed=(),
        default_lane="GREEN",
        policy_tags=("system_internal",),
        input_schema={
            "type": "object",
            "properties": {
                "trace_id": {"type": "string"},
                "status": {"type": "string"},
                "agent_response": {"type": "object"},
            },
        },
        output_schema={},
    ),
    "mint_pilot_session": ToolContract(
        canonical_name="mint_pilot_session",
        aliases=(),
        side_effect=True,
        idempotency_required=True,
        compensable=False,
        compensation_tools_allowed=(),
        default_lane="YELLOW",
        policy_tags=("system_internal",),
        input_schema={
            "type": "object",
            "properties": {
                "user_id": {"type": "string"},
                "tenant_id": {"type": "string"},
                "connection_id": {"type": "string"},
                "trace_id": {"type": "string"},
            },
        },
        output_schema={},
    ),
}


def resolve_tool_name(name: str) -> str | None:
    if name in TOOL_REGISTRY:
        return name
    for canonical, contract in TOOL_REGISTRY.items():
        if name in contract.aliases:
            return canonical
    return None


def get_tool_contract(name: str) -> ToolContract | None:
    canonical = resolve_tool_name(name)
    return TOOL_REGISTRY.get(canonical) if canonical else None
