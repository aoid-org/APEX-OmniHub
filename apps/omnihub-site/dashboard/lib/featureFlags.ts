type BooleanFlag =
  | 'VITE_ENABLE_REQUEST_ACCESS'
  | 'VITE_MAESTRO_ENABLED'
  | 'VITE_CONNECT_AI_ENABLED'
  | 'VITE_DEMO_MODE'
  | 'VITE_PHYSIOMNI_DEMO_ENABLED'
  | 'VITE_PHYSIOMNI_LIVE_ENABLED'
  | 'VITE_PHYSIOMNI_PHYSICAL_ACTIONS_ENABLED';

export function flag(name: BooleanFlag): boolean {
  return import.meta.env[name] === 'true';
}
