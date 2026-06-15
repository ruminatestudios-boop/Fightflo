"use client";

export type HomeMainTab = "home" | "library";

interface HomeStickyNavProps {
  activeTab: HomeMainTab;
  onTabChange: (tab: HomeMainTab) => void;
  libraryCount?: number;
}

export function HomeStickyNav({
  activeTab,
  onTabChange,
  libraryCount = 0,
}: HomeStickyNavProps) {
  return (
    <nav className="home-sticky-nav" aria-label="Main navigation">
      <button
        type="button"
        className={`home-sticky-nav-tab ${activeTab === "home" ? "home-sticky-nav-tab--active" : ""}`}
        onClick={() => onTabChange("home")}
        aria-current={activeTab === "home" ? "page" : undefined}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Home</span>
      </button>

      <button
        type="button"
        className={`home-sticky-nav-tab ${activeTab === "library" ? "home-sticky-nav-tab--active" : ""}`}
        onClick={() => onTabChange("library")}
        aria-current={activeTab === "library" ? "page" : undefined}
      >
        <span className="home-sticky-nav-tab-icon-wrap">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {libraryCount > 0 && (
            <span className="home-sticky-nav-badge" aria-hidden>
              {libraryCount > 9 ? "9+" : libraryCount}
            </span>
          )}
        </span>
        <span>Library</span>
      </button>
    </nav>
  );
}
