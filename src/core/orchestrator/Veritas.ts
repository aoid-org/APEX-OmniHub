/**
 * Veritas — Tool output validation engine.
 *
 * Validates raw tool execution results against expected
 * contracts before allowing ChronosLock to commit.
 * Pure, stateless, deterministic.
 *
 * @module core/orchestrator/Veritas
 * @version 1.0.0
 * @date 2026-02-09
 */

/** Shape returned by validate(). */
export interface ValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Per-tool validation rules.
 * Each entry receives the raw result and returns a ValidationResult.
 */
const VALIDATORS: Record<string, (result: unknown) => ValidationResult> = {
  search_database: validateHasData,
  create_record: validateHasId,
  delete_record: validateSuccessFlag,
  send_email: validateSuccessFlag,
  call_webhook: validateSuccessFlag,
  search_youtube: validateHasData,
  update_context: validateSuccessFlag,
};

/* ------------------------------------------------------------------ */
/*  Shared validators                                                  */
/* ------------------------------------------------------------------ */

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function validateHasData(result: unknown): ValidationResult {
  if (!isObject(result)) {
    return { valid: false, reason: "Result is not an object" };
  }
  if (!("data" in result) && !("videos" in result)) {
    return { valid: false, reason: "Missing data field" };
  }
  return { valid: true };
}

function hasDurableId(value: unknown): boolean {
  return (
    isObject(value) && typeof value.id === "string" && value.id.trim() !== ""
  );
}

function validateHasId(result: unknown): ValidationResult {
  if (!isObject(result)) {
    return { valid: false, reason: "Result is not an object" };
  }
  if ("success" in result && result.success !== true) {
    return { valid: false, reason: "Success flag must be true" };
  }
  if (typeof result.id === "string" && result.id.trim() !== "") {
    return { valid: true };
  }
  if (Array.isArray(result.data) && result.data.some(hasDurableId)) {
    return { valid: true };
  }
  if (hasDurableId(result.data)) {
    return { valid: true };
  }
  return {
    valid: false,
    reason: "Missing durable persisted id",
  };
}

function validateSuccessFlag(result: unknown): ValidationResult {
  if (!isObject(result)) {
    return { valid: false, reason: "Result is not an object" };
  }
  if (result.success !== true) {
    return { valid: false, reason: "Success flag must be true" };
  }
  return { valid: true };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Validate a tool's raw result against its expected contract.
 *
 * Tools without a registered validator fail closed so future tools
 * cannot commit without an explicit result contract.
 *
 * @param toolName - canonical tool identifier
 * @param result   - raw execution output
 */
export function validate(toolName: string, result: unknown): ValidationResult {
  const validator = VALIDATORS[toolName];
  if (!validator) {
    return {
      valid: false,
      reason: `No validator registered for tool "${toolName}"`,
    };
  }
  return validator(result);
}
