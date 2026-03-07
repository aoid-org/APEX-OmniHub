"""
Intent Registry Seed — Maps intentIds to existing Temporal Activities.

Import this module at worker startup to populate the registry before
any workflow attempts to resolve an intent.

Each map_intent() call maps a semantic intent string to the Temporal
activity name (the ``name`` argument of ``@activity.defn``).
"""

from core.intent_registry import registry

# ── Tool Activities (from activities/tools.py) ────────────────────────
# These names MUST match the @activity.defn(name="...") values exactly.
registry.map_intent("search_database", "search_database")
registry.map_intent("create_record", "create_record")
registry.map_intent("delete_record", "delete_record")
registry.map_intent("send_email", "send_email")
registry.map_intent("call_webhook", "call_webhook")
registry.map_intent("search_youtube", "search_youtube")

# ── MAN Mode Activities (from activities/man_mode.py) ─────────────────
registry.map_intent("risk_triage", "risk_triage")
registry.map_intent("create_man_task", "create_man_task")
registry.map_intent("resolve_man_task", "resolve_man_task")
registry.map_intent("get_man_task", "get_man_task")
registry.map_intent("check_man_decision", "check_man_decision")

# ── Policy Activities (from activities/omni_policy.py) ────────────────
registry.map_intent("evaluate_policy", "evaluate_policy")

# ── Iron Law Verification (from activities/iron_law_verify.py) ────────
registry.map_intent("verify_deductive_path", "verify_deductive_path")

# ── Notification Activities (from activities/notify_man_task.py) ──────
registry.map_intent("notify_man_task", "notify_man_task")
