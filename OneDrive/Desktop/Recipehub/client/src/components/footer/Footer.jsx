// src/components/footer/Footer.jsx
import { Link } from "react-router-dom";

// ── DATA ─────────────────────────────────────────────────────────────────────

const FOOTER_COLUMNS = [
  {
    heading: "Explore",
    links: [
      { label: "Home",           path: "/" },
      { label: "Browse Recipes", path: "/recipes" },
      { label: "Categories",     path: "/categories" },
      { label: "Featured Chefs", path: "/chefs" },
    ],
  },
  {
    heading: "Services",
    links: [
      { label: "Book a Chef",  path: "/booking" },
      { label: "Meal Planner", path: "/planner" },
      { label: "About Us",     path: "/about" },
      { label: "Contact",      path: "/contact" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Login",     path: "/login" },
      { label: "Register",  path: "/register" },
      { label: "Dashboard", path: "/dashboard" },
      { label: "Favorites", path: "/favorites" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help Center", path: "#" },
      { label: "Safety",      path: "#" },
      { label: "Terms",       path: "#" },
      { label: "Privacy",     path: "#" },
    ],
  },
];

const SOCIALS = [
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "X / Twitter",
    href: "#",
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: "Pinterest",
    href: "#",
    icon: (
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    ),
  },
];

// ── SUBCOMPONENTS ─────────────────────────────────────────────────────────────

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="text-sm transition-colors duration-200"
      style={{ color: "#6b6259", textDecoration: "none", lineHeight: "1.6" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#f5f0ea")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6259")}
    >
      {children}
    </Link>
  );
}

function SocialButton({ href, label, icon }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200"
      style={{
        border: "1px solid rgba(232,160,74,0.25)",
        color: "#6b6259",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#e8a04a";
        e.currentTarget.style.borderColor = "#e8a04a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#6b6259";
        e.currentTarget.style.borderColor = "rgba(232,160,74,0.25)";
      }}
    >
      {icon}
    </a>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function Footer() {
  return (
    <footer
      style={{
        background: "#0a0806",
        borderTop: "1px solid rgba(232,160,74,0.1)",
        fontFamily: "'Trebuchet MS', sans-serif",
      }}
    >

      {/* ══ MAIN BODY ══════════════════════════════════════════════════════════
          Mobile  : brand block stacked above 2×2 link grid
          Desktop : brand col (fixed width) | 4-col link grid side by side
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16">

          {/* ── BRAND BLOCK ── */}
          <div className="flex flex-col gap-4 md:w-64 shrink-0">
            <Link
              to="/"
              style={{
                fontFamily: "'Georgia', serif",
                fontSize: "1.4rem",
                fontWeight: "bold",
                color: "#e8a04a",
                letterSpacing: "0.02em",
                textDecoration: "none",
              }}
            >
              Recipe Hub
            </Link>

            <p style={{ color: "#6b6259", fontSize: "0.85rem", lineHeight: 1.75 }}>
              Elevating the culinary landscape by bridging the gap between
              artisan chefs and discerning food lovers.
            </p>

            <div className="flex items-center gap-2 mt-1">
              {SOCIALS.map((s) => (
                <SocialButton key={s.label} {...s} />
              ))}
            </div>
          </div>

          {/* ── LINK COLUMNS ──
              Mobile  : 2 columns
              Desktop : 4 columns
          ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading} className="flex flex-col gap-2">
                <h4
                  className="mb-2"
                  style={{
                    color: "#e8a04a",
                    fontSize: "0.7rem",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  {col.heading}
                </h4>
                {col.links.map((link) => (
                  <FooterLink key={link.label} to={link.path}>
                    {link.label}
                  </FooterLink>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ NEWSLETTER STRIP ═══════════════════════════════════════════════════
          Mobile  : label stacked above input
          Desktop : label on left, input on right
      ════════════════════════════════════════════════════════════════════════ */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">

          {/* Label */}
          <div className="shrink-0">
            <p style={{ color: "#f5f0ea", fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.2rem" }}>
              Stay in the loop
            </p>
            <p style={{ color: "#6b6259", fontSize: "0.8rem" }}>
              Weekly recipes, chef spotlights and exclusive offers.
            </p>
          </div>

          {/* Input row */}
          <div
            className="flex w-full md:w-auto"
            style={{
              maxWidth: "400px",
              borderRadius: "999px",
              overflow: "hidden",
              border: "1px solid rgba(232,160,74,0.25)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <input
              type="email"
              placeholder="your@email.com"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "0.65rem 1rem",
                fontSize: "0.85rem",
                color: "#f5f0ea",
                fontFamily: "'Trebuchet MS', sans-serif",
              }}
            />
            <button
              style={{
                padding: "0.55rem 1.2rem",
                margin: "4px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #e8a04a 0%, #c97c28 100%)",
                color: "#0f0d0b",
                fontFamily: "'Trebuchet MS', sans-serif",
                fontSize: "0.8rem",
                fontWeight: "700",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
                transition: "filter 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* ══ BOTTOM BAR ═════════════════════════════════════════════════════════
          Mobile  : centered, stacked
          Desktop : copyright left | legal links right
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center md:justify-between gap-3 text-center md:text-left">
        <p style={{ color: "#3d3530", fontSize: "0.78rem" }}>
          © {new Date().getFullYear()} Recipe Hub. All rights reserved.
        </p>
        <div className="flex items-center gap-5 flex-wrap justify-center md:justify-end">
          {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
            <a
              key={item}
              href="#"
              style={{
                color: "#3d3530",
                fontSize: "0.78rem",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#9a8f85")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#3d3530")}
            >
              {item}
            </a>
          ))}
        </div>
      </div>

    </footer>
  );
}