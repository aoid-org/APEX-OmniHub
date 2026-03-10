"""
Intent Registry Seed — Populates the Universal Intent Registry at startup.

This module is imported for its side effects: importing the universal_intents
module triggers @registry.register_intent decorators, which populate the
registry singleton. For pre-existing activities that already have Temporal
@activity.defn names, we use registry.map_intent() to bridge them into the
intent routing table.

Import order matters: universal_intents must be imported FIRST so the
decorator-registered activities are available before map_intent calls
(which would fail on duplicate registration).
"""

# ── Decorator-registered activities (3 real @registry.register_intent) ─
# These are the canonical USO activities with dual registration:
# @registry.register_intent + @activity.defn in the same function.
import activities.universal_intents  # noqa: F401

# ── Bridge mappings for pre-existing Temporal activities ──────────────
# These activities already have @activity.defn(name="...") in their source
# files. We map their intentId → Temporal activity name so the USO can
# route to them without modifying the original activity code.
from core.intent_registry import registry

# Tool Activities (activities/tools.py)
registry.map_intent("search_database", "search_database")
registry.map_intent("create_record", "create_record")
registry.map_intent("delete_record", "delete_record")
registry.map_intent("send_email", "send_email")
registry.map_intent("call_webhook", "call_webhook")
registry.map_intent("search_youtube", "search_youtube")

# MAN Mode Activities (activities/man_mode.py)
registry.map_intent("risk_triage", "risk_triage")
registry.map_intent("create_man_task", "create_man_task")
registry.map_intent("resolve_man_task", "resolve_man_task")
registry.map_intent("get_man_task", "get_man_task")
registry.map_intent("check_man_decision", "check_man_decision")

# Policy Activities (activities/omni_policy.py)
registry.map_intent("evaluate_policy", "evaluate_policy")

# Iron Law Verification (activities/iron_law_verify.py)
registry.map_intent("verify_deductive_path", "verify_deductive_path")

# Notification Activities (activities/notify_man_task.py)
registry.map_intent("notify_man_task", "notify_man_task")
