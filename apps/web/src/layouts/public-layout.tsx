import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";

import { AmbientBackground } from "../components/ambient-background";
import { BrandMark } from "../components/brand-mark";

export function PublicLayout() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  return (
    <div className="app-frame">
      <AmbientBackground />
      <header className="site-header">
        <div className="shell nav-shell">
          <Link to="/" className="brand-link"><BrandMark /></Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            <a href="#care">Our care</a>
            <a href="#availability-preview">Availability</a>
            <a href="#privacy">Privacy</a>
          </nav>
          <div className="nav-actions">
            <Link className="button button-ghost" to="/login">Sign in</Link>
            <Link className="button button-primary" to="/signup">Book a visit</Link>
          </div>
          <button className="mobile-menu" type="button" aria-label={navigationOpen ? "Close navigation" : "Open navigation"} aria-expanded={navigationOpen} aria-controls="public-mobile-navigation" onClick={() => setNavigationOpen((open) => !open)}>
            <Menu size={21} />
          </button>
          {navigationOpen && <nav className="public-mobile-navigation glass-panel" id="public-mobile-navigation" aria-label="Mobile navigation">
            <Link to="/" onClick={() => setNavigationOpen(false)}>Home</Link>
            <Link to="/login" onClick={() => setNavigationOpen(false)}>Sign in</Link>
            <Link className="button button-primary" to="/signup" onClick={() => setNavigationOpen(false)}>Book a visit</Link>
          </nav>}
        </div>
      </header>
      <main><Outlet /></main>
    </div>
  );
}
