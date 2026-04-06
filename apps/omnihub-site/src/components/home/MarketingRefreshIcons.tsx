import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function BaseIcon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconDirective(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 4h12M3 8h8M3 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="14" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 10l1 1 1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </BaseIcon>
  );
}

export function IconRouting(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10" cy="10" r="2.5" fill="currentColor" opacity="0.85" />
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="3 2" />
      <path d="M10 2.5V1M10 19v-1.5M2.5 10H1M19 10h-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function IconOverride(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 6v4M8 8l2 2 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 14h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
    </BaseIcon>
  );
}

export function IconRollback(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 10a4 4 0 0 1 4-4h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 3l3 2-3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 15H8a4 4 0 0 1 0-8" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
    </BaseIcon>
  );
}

export function IconContainment(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10 2L16 5.5v7L10 16 4 12.5v-7L10 2Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 8v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="13" r="0.8" fill="currentColor" />
    </BaseIcon>
  );
}

export function IconCompensate(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="2.5" y="5" width="6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="11.5" y="11" width="6" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 7h3M8.5 13h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11.5 7c0 2-1 4-1.5 4" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" opacity="0.6" />
    </BaseIcon>
  );
}

export function IconConnector(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 10h14M10 3v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="4 2.5" opacity="0.5" />
      <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.8" />
    </BaseIcon>
  );
}

export function IconAgents(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="4" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.3 6.8 5.7 12.8M11.7 6.8 14.3 12.8M6.5 15h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function IconTelemetry(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M2 14l3-6 3 4 3-6 3 3 3-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="5" r="1.5" fill="currentColor" />
    </BaseIcon>
  );
}

export function IconPolicy(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10 2 16 5.5v9L10 18 4 14.5v-9L10 2Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 8v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.8" fill="currentColor" />
    </BaseIcon>
  );
}

export function IconWorkflow(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="4" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="12" y="4" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.5" y="12" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 6h4M10 8v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function IconManMode(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10 2.5a4 4 0 0 1 4 4v2.5h1.5A1.5 1.5 0 0 1 17 10.5v5A1.5 1.5 0 0 1 15.5 17h-11A1.5 1.5 0 0 1 3 15.5v-5A1.5 1.5 0 0 1 4.5 9H6V6.5a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 11.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </BaseIcon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
      <path d="M6.5 10.5 8.8 12.8 13.8 7.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </BaseIcon>
  );
}
