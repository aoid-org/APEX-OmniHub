/**
 * Module Action Capabilities Contract
 * Maps module action IDs (hyphenated or underscored) to whether they are
 * supported by the backend pipeline yet. Prevents generic 500 errors.
 */

export const SUPPORTED_ACTIONS = new Set<string>([
  'add-link',
  'add_link',
  'send-to-omnislate',
  'send_to_omnislate',
]);

export function isActionSupported(actionId: string): boolean {
  return SUPPORTED_ACTIONS.has(actionId);
}
