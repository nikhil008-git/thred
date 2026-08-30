export function BetaBanner() {
  return (
    <div className="beta-banner" role="status" aria-live="polite">
      <p className="beta-banner-copy">
        <span className="beta-banner-label">Beta</span>
        <span className="beta-banner-separator" aria-hidden="true">
          ·
        </span>
        <span className="beta-banner-text beta-banner-text-full">
          We&apos;re actively building this — expect rough edges and things to shift.
        </span>
        <span className="beta-banner-text beta-banner-text-short">
          Actively building — rough edges ahead.
        </span>
      </p>
    </div>
  );
}
