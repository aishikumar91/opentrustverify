export function SkeletonPreloader() {
  return (
    <div className="otv-skel" role="status" aria-live="polite" aria-label="Loading">
      <header className="otv-header">
        <div className="otv-container otv-header-row">
          <span className="otv-skel-bar otv-skel-logo" />
          <span className="otv-skel-bar otv-skel-nav" />
          <span className="otv-skel-bar otv-skel-action" />
        </div>
      </header>
      <section className="otv-stage">
        <div className="otv-container">
          <div className="otv-frame otv-frame-hero">
            <div className="otv-hero-layout">
              <div className="otv-hero-copy">
                <span className="otv-skel-bar otv-skel-kicker" />
                <span className="otv-skel-bar otv-skel-title" />
                <span className="otv-skel-bar otv-skel-title otv-skel-short" />
                <span className="otv-skel-bar otv-skel-line" />
                <span className="otv-skel-bar otv-skel-line otv-skel-shorter" />
              </div>
              <span className="otv-skel-bar otv-skel-orbit" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
