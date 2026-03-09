// FIX: Provide root-alias entrypoint for OmniHub-site hook
// ROOT CAUSE: tests resolve "@" from repo root, but omnihub-site imports "@/hooks/useOmniDashAction"
// CHANGE: Re-export the real hook so Vite/Vitest can resolve it
export { useOmniDashAction, type OmniDashIntent } from '../../apps/omnihub-site/src/hooks/useOmniDashAction';
