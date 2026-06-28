/**
 * LIVE_APEX_APPS — First-party APEX ecosystem apps with OmniPort installed.
 *
 * Authoritative registry consumed by the APEX Apps MCP connect modal
 * (ApexAppsMcpModule.tsx) for prompt-first resolution. URLs must be real and
 * fetchable — they are the OmniPort handoff targets.
 *
 * NOTE: FLOWBills uses flowbills.ca (confirmed canonical domain).
 *
 * OWNED BY: APEX Business Systems Ltd.
 */
export const LIVE_APEX_APPS = [
  { id: 'aspiral', label: 'aSpiral', url: 'https://aspiral.icu' },
  { id: 'jubeelove', label: 'Jubee Love', url: 'https://jubee.love' },
  { id: 'armageddon', label: 'Armageddon Test Suite', url: 'https://armageddontest.icu' },
  { id: 'playmoney', label: 'PlayMoney', url: 'https://playmoney.icu' },
  { id: 'dueradar', label: 'DueRadar', url: 'https://dueradar.icu' },
  { id: 'thelampstand', label: 'TheLampStand', url: 'https://thelampstand.icu' },
  { id: 'cheapstays', label: 'CheapStays', url: 'https://cheapstays.me' },
  { id: 'sbbl-hq', label: 'SBBL-HQ', url: 'https://sbbl-hq.icu' },
  { id: 'flowbills', label: 'FLOWBills', url: 'https://flowbills.ca' },
] as const;
