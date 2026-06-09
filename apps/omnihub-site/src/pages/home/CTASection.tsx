export function CTASection({ onOpenModal }: Readonly<{ onOpenModal: () => void }>) {
  return (
    <section className="cta-sec hov-section" id="cta">
      <div className="cta-bg"></div>
      <div className="cta-grid"></div>
      <div className="cta-in">
        <div className="tag rv" style={{ justifyContent: 'center' }}>Take Control</div>
        <h2 className="cta-h2 rv">Take operational<br />authority back.</h2>
        <p className="cta-sub rv d1">Join enterprises that have moved beyond black-box AI. Request early access and experience what governed intelligence looks like in production.</p>
        <div className="cta-btns rv d2">
          <button
            type="button"
            className="pill pill-lg"
            onClick={onOpenModal}
          >
            Request Early Access
          </button>
          <a href="/demo.html" className="pill pill-lg pill-ghost">Schedule a Demo</a>
        </div>
        <p className="cta-note rv d3">No vendor lock-in. No black boxes. No surprises.</p>
      </div>
    </section>
  );
}
