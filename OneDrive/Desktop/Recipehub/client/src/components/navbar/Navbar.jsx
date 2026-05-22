import React, { useState } from "react";
const NAV_LINKS = ["Home", "Browse", "Chefs", "Pricing"];

const NAvbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div>
      {/* ── NAVBAR ── */}
      <nav className="flex items-center px-6 py-4 relative z-50">
        {/* Left: Hamburger (mobile) + Logo (desktop) */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white focus:outline-none"
            aria-label="Menu"
          >
            <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
              <rect y="0" width="22" height="2" rx="1" fill="#e8a04a" />
              <rect y="8" width="16" height="2" rx="1" fill="#e8a04a" />
              <rect y="16" width="22" height="2" rx="1" fill="#e8a04a" />
            </svg>
          </button>

          {/* Logo — visible on desktop in normal flow */}
          <span
            className="hidden md:inline"
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: "1.35rem",
              fontWeight: "bold",
              color: "#e8a04a",
              letterSpacing: "0.02em",
            }}
          >
            Recipe Hub
          </span>
        </div>

        {/* Center: Logo on mobile (absolute), Nav links on desktop */}
        {/* Mobile logo — absolutely centered */}
        <div className="absolute left-1/2 -translate-x-1/2 md:hidden">
          <span
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: "1.35rem",
              fontWeight: "bold",
              color: "#e8a04a",
              letterSpacing: "0.02em",
            }}
          >
            Recipe Hub
          </span>
        </div>

        {/* Desktop nav links — centered */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((l) => (
            <a
              key={l}
              href="#"
              style={{
                fontFamily: "'Trebuchet MS', sans-serif",
                fontSize: "0.875rem",
              }}
              className="text-gray-300 hover:text-white transition-colors duration-200 tracking-wide"
            >
              {l}
            </a>
          ))}
        </div>

        {/* Right: Icons */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <button className="text-gray-300 hover:text-white transition-colors">
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "#e8a04a", color: "#0f0d0b" }}
          >
            JK
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden absolute top-16 left-0 right-0 z-40 py-4 px-6 flex flex-col gap-4"
          style={{ background: "#1a1410" }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l}
              href="#"
              className="text-gray-300 hover:text-white text-sm tracking-wide"
            >
              {l}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default NAvbar;
