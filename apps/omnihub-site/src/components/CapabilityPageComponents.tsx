import type { ReactNode } from 'react';

/**
 * Reusable components for capability pages
 * Reduces code duplication across all capability pages
 */

interface IconContainerProps {
  readonly children: ReactNode;
}

export function IconContainer({ children }: IconContainerProps) {
  return <div className="capability-icon-container">{children}</div>;
}

interface BulletListProps {
  readonly items: readonly string[];
  readonly variant?: 'square' | 'circle';
  readonly className?: string;
}

export function BulletList({ items, variant = 'square', className = '' }: BulletListProps) {
  const itemClass = variant === 'circle'
    ? 'bullet-list__item bullet-list__item--circle text-secondary text-sm'
    : 'bullet-list__item text-secondary';

  return (
    <ul className={`bullet-list ${className}`}>
      {items.map((item) => (
        <li key={item} className={itemClass}>
          {item}
        </li>
      ))}
    </ul>
  );
}

interface FeatureCardProps {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly details?: string;
  readonly bulletPoints?: readonly string[];
}

export function FeatureCard({ icon, title, description, details, bulletPoints }: FeatureCardProps) {
  return (
    <div className="card" style={{ padding: 'var(--space-8)' }}>
      <div className="feature-card-with-icon">
        <IconContainer>{icon}</IconContainer>
        <div className="feature-card-with-icon__content">
          <h3 className="heading-3 mb-4">{title}</h3>
          <p className="text-secondary mb-4">
            <strong>{description}</strong>
          </p>
          {details && (
            <p className="text-secondary mb-4">{details}</p>
          )}
          {bulletPoints && bulletPoints.length > 0 && (
            <BulletList items={bulletPoints} />
          )}
        </div>
      </div>
    </div>
  );
}

interface CTASectionProps {
  readonly title: string;
  readonly description: string;
  readonly buttonText: string;
  readonly buttonHref: string;
}

export function CTASection({ title, description, buttonText, buttonHref }: CTASectionProps) {
  return (
    <div className="cta-section">
      <h3 className="heading-3 mb-4">{title}</h3>
      <p className="text-secondary mb-8">{description}</p>
      <a href={buttonHref} className="btn btn--primary">
        {buttonText}
      </a>
    </div>
  );
}

interface SpecTableProps {
  readonly specs: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}

export function SpecTable({ specs }: SpecTableProps) {
  return (
    <div className="card" style={{ padding: 'var(--space-6)', backgroundColor: 'var(--color-surface-elevated)' }}>
      <ul className="spec-table text-secondary">
        {specs.map((spec) => (
          <li key={spec.label} className="spec-table__row">
            <span className="spec-table__label">{spec.label}</span>
            <span>{spec.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface UseCaseCardProps {
  readonly title: string;
  readonly description: string;
}

export function UseCaseCard({ title, description }: UseCaseCardProps) {
  return (
    <div className="card" style={{ padding: 'var(--space-6)' }}>
      <h4 className="heading-4 mb-2">{title}</h4>
      <p className="text-secondary text-sm">{description}</p>
    </div>
  );
}

interface InfoCardProps {
  readonly title: string;
  readonly description: string;
  readonly bulletPoints?: readonly string[];
}

export function InfoCard({ title, description, bulletPoints }: InfoCardProps) {
  return (
    <div className="card" style={{ padding: 'var(--space-6)' }}>
      <h3 className="heading-4 mb-3">{title}</h3>
      <p className="text-secondary text-sm mb-4">{description}</p>
      {bulletPoints && bulletPoints.length > 0 && (
        <BulletList items={bulletPoints} variant="circle" />
      )}
    </div>
  );
}

interface StatProps {
  readonly value: string;
  readonly label: string;
}

export function Stat({ value, label }: StatProps) {
  return (
    <div>
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

interface StatsGridProps {
  readonly stats: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly className?: string;
}

export function StatsGrid({ stats, className = '' }: StatsGridProps) {
  return (
    <div className={`stats-grid ${className}`}>
      {stats.map((stat) => (
        <Stat key={stat.label} value={stat.value} label={stat.label} />
      ))}
    </div>
  );
}
