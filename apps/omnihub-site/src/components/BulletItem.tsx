/**
 * Reusable bullet item component for lists.
 * Fixes SonarQube "Ambiguous spacing after previous element span" warning.
 */
interface BulletItemProps {
  readonly children: React.ReactNode;
}

export function BulletItem({ children }: BulletItemProps) {
  return (
    <li className="text-secondary text-sm" style={{ paddingLeft: 'var(--space-6)', position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: '0.5em',
          width: '6px',
          height: '6px',
          backgroundColor: 'var(--color-accent)',
          borderRadius: '50%',
        }}
        aria-hidden="true"
      />
      {children}
    </li>
  );
}

export function BulletList({ children }: { readonly children: React.ReactNode }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {children}
    </ul>
  );
}
