/* eslint-disable @typescript-eslint/ban-ts-comment */
// deno-lint-ignore-file no-import-prefix require-await
/**
 * Execute Workflow Edge Function
 *
 * Runs a saved workflow's steps in order. Each step is shaped exactly like an
 * Automation action (send_email, create_record, webhook, notification) and is
 * executed by the same shared executor used by execute-automation — a workflow
 * is a sequence of those same real actions, not a separate execution model.
 *
 * Fail-fast: the first step that throws stops the run; earlier steps' results
 * are preserved in the run's logs. No Temporal/orchestrator involvement — this
 * stays entirely within Supabase edge functions, same trust boundary as
 * execute-automation.
 *
 * Security:
 * - UUID validation for workflowId
 * - Table allowlist + SSRF protection inherited from the shared executor
 * - workflow_runs row is owned by the authenticated user (RLS-enforced)
 */

// @ts-ignore: Deno imports are not recognized by standard TS
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, authenticateUser } from "../_shared/auth.ts";
import { handleCors, corsJsonResponse } from "../_shared/cors.ts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";
import { executeAction, type ActionConfig, type ActionType } from "../_shared/action-executor.ts";
// @ts-ignore: Deno imports are not recognized by standard TS
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_STEPS = 10;

interface WorkflowStep {
  action_type: ActionType;
  config: ActionConfig;
}

interface Workflow {
  id: string;
  name: string;
  definition: { steps?: unknown };
  is_active: boolean;
}

interface StepLog {
  step_index: number;
  action_type: string;
  status: "success" | "failed";
  result?: unknown;
  error?: string;
}

function isWorkflowStep(value: unknown): value is WorkflowStep {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.action_type === "string" &&
    ["send_email", "create_record", "webhook", "notification"].includes(v.action_type) &&
    v.config !== null &&
    typeof v.config === "object"
  );
}

function parseSteps(definition: Workflow["definition"]): WorkflowStep[] | null {
  const raw = definition?.steps;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (raw.length > MAX_STEPS) return null;
  if (!raw.every(isWorkflowStep)) return null;
  return raw as WorkflowStep[];
}

async function runSteps(
  steps: WorkflowStep[],
  supabase: SupabaseClient,
  userId: string,
): Promise<{ logs: StepLog[]; status: "success" | "failed"; errorMessage: string | null }> {
  const logs: StepLog[] = [];
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    try {
      const result = await executeAction(step.action_type, step.config, supabase, userId);
      logs.push({ step_index: i, action_type: step.action_type, status: "success", result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown step error";
      logs.push({ step_index: i, action_type: step.action_type, status: "failed", error: message });
      return { logs, status: "failed", errorMessage: `Step ${i + 1} (${step.action_type}): ${message}` };
    }
  }
  return { logs, status: "success", errorMessage: null };
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return corsJsonResponse({ error: "method_not_allowed", message: "Only POST is allowed" }, 405);
  }

  try {
    const supabase = createSupabaseClient();

    const authHeader = req.headers.get("Authorization");
    const { success, user, error: authError } = await authenticateUser(authHeader, supabase);
    if (!success || !user) {
      return corsJsonResponse({ error: "unauthorized", message: authError || "Authentication failed" }, 401);
    }

    const rl = await checkRateLimit(user.id, RATE_LIMIT_CONFIGS.executeWorkflow);
    if (!rl.allowed) {
      return rateLimitExceededResponse(req.headers.get("origin"), rl);
    }

    const body = await req.json();
    const { workflowId } = body;

    if (!workflowId || typeof workflowId !== "string" || !UUID_REGEX.test(workflowId)) {
      return corsJsonResponse(
        { error: "validation_error", message: "Invalid workflowId (must be UUID)" },
        400,
      );
    }

    const { data: workflow, error: fetchError } = await supabase
      .from("workflows")
      .select("id, name, definition, is_active")
      .eq("id", workflowId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return corsJsonResponse({ error: "not_found", message: "Workflow not found" }, 404);
      }
      throw fetchError;
    }

    const typedWorkflow = workflow as Workflow;
    if (!typedWorkflow.is_active) {
      return corsJsonResponse({ error: "inactive", message: "Workflow is not active" }, 400);
    }

    const steps = parseSteps(typedWorkflow.definition);
    if (!steps) {
      return corsJsonResponse(
        {
          error: "invalid_definition",
          message: `Workflow has no valid steps. definition.steps must be a non-empty array of at most ${MAX_STEPS} { action_type, config } steps.`,
        },
        400,
      );
    }

    const { data: run, error: runInsertError } = await supabase
      .from("workflow_runs")
      .insert({ workflow_id: typedWorkflow.id, user_id: user.id, status: "running", logs: [] })
      .select("id")
      .single();
    if (runInsertError || !run) {
      throw runInsertError ?? new Error("Failed to create workflow_runs row");
    }

    const { logs, status, errorMessage } = await runSteps(steps, supabase, user.id);

    await supabase
      .from("workflow_runs")
      .update({ status, logs, error_message: errorMessage })
      .eq("id", run.id)
      .eq("user_id", user.id);

    return corsJsonResponse({
      success: status === "success",
      run_id: run.id,
      status,
      steps_total: steps.length,
      steps_completed: logs.filter((l) => l.status === "success").length,
      logs,
    });
  } catch (error) {
    console.error("Workflow execution error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return corsJsonResponse({ error: "execution_error", message }, 500);
  }
});
