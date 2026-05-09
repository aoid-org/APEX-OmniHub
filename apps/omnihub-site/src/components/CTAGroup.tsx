interface CTAButton {
  readonly label: string;
  readonly href: string;
}

type CTAGroupProps = Readonly<{
  primary?: CTAButton;
  secondary?: CTAButton;
  link?: CTAButton;
  centered?: boolean;
}>;

export function CTAGroup({
  primary,
  secondary,
  link,
  centered = false,
}: CTAGroupProps) {
  // Safeguard: Ensure we don't render empty blocks or buttons without labels
  const hasPrimary = primary?.label && primary?.href;
  const hasSecondary = secondary?.label && secondary?.href;
  const hasLink = link?.label && link?.href;

  if (!hasPrimary && !hasSecondary && !hasLink) return null;

  return (
    <div className={`cta-group flex flex-col sm:flex-row gap-4 ${centered ? 'justify-center cta-group--center' : ''}`}>
      {hasPrimary && (
        <a href={primary.href} className="btn btn--primary btn--lg flex-1 min-w-[200px] text-center flex items-center justify-center">
          {primary.label}
        </a>
      )}
      {hasSecondary && (
        <a href={secondary.href} className="btn btn--secondary btn--lg min-w-[200px] text-center flex items-center justify-center">
          {secondary.label}
        </a>
      )}
      {hasLink && (
        <a href={link.href} className="btn btn--ghost text-center flex items-center justify-center">
          {link.label} &rarr;
        </a>
      )}
    </div>
  );
}
