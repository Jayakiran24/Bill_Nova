import { useState } from "react";

// const CARDS = [
//   {
//     id: 1,
//     img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
//     tag: "Fine Dining",
//     title: "Candlelit Elegance",
//   },
//   {
//     id: 2,
//     img: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&q=80",
//     tag: "Master Chef",
//     title: "World-Class Talent",
//   },
// ];

export default function HeroSection() {
  const [address, setAddress] = useState("");

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: "#0f0d0b",
        minHeight: "100vh",
      }}
      className="text-white"
    >
      {/* ── HERO ── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{ minHeight: "88vh", paddingTop: "2rem", paddingBottom: "4rem" }}
      >
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(232,160,74,0.13) 0%, transparent 70%)",
          }}
        />

        {/* Floating food card — left */}
        <div
          className="absolute hidden md:block"
          style={{
            left: "3%",
            top: "10%",
            width: "170px",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
            transform: "rotate(-6deg)",
            border: "2px solid rgba(232,160,74,0.2)",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&q=80"
            alt="Chef"
            style={{
              width: "100%",
              height: "200px",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        {/* Floating food card — right */}
        <div
          className="absolute hidden md:block"
          style={{
            right: "3%",
            top: "8%",
            width: "170px",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
            transform: "rotate(5deg)",
            border: "2px solid rgba(232,160,74,0.2)",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80"
            alt="Fine dining plate"
            style={{
              width: "100%",
              height: "200px",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs tracking-widest uppercase"
          style={{
            background: "rgba(232,160,74,0.12)",
            border: "1px solid rgba(232,160,74,0.35)",
            color: "#e8a04a",
            fontFamily: "'Trebuchet MS', sans-serif",
            letterSpacing: "0.18em",
          }}
        >
          Culinary Excellence
        </div>

        {/* Headline */}
        <h1
          className="relative z-10 leading-tight"
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: "clamp(2.6rem, 7vw, 5.2rem)",
            fontWeight: "bold",
            maxWidth: "750px",
            lineHeight: 1.12,
            color: "#f5f0ea",
          }}
        >
          Savor the Art of{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "#e8a04a",
              display: "inline-block",
            }}
          >
            Fine
            <br />
            Dining
          </em>{" "}
          at Home
        </h1>

        {/* Subtext */}
        <p
          className="mt-6 relative z-10"
          style={{
            fontFamily: "'Trebuchet MS', sans-serif",
            fontSize: "0.95rem",
            color: "#9a8f85",
            maxWidth: "480px",
            lineHeight: 1.7,
          }}
        >
          Connect with world-class master chefs or order artisan meals delivered
          straight to your table. Experience gastronomy redefined.
        </p>

        {/* Search bar */}
        <div
          className="mt-10 relative z-10 flex items-center w-full max-w-md rounded-full overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
          }}
        >
          <span className="pl-5 pr-2 text-gray-400 flex-shrink-0">
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Enter your delivery address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1 bg-transparent outline-none py-3 pr-2 text-sm text-gray-200 placeholder-gray-500"
            style={{ fontFamily: "'Trebuchet MS', sans-serif" }}
          />
          <button
            className="px-6 py-3 text-sm font-semibold rounded-full transition-all duration-200 hover:brightness-110 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #e8a04a 0%, #c97c28 100%)",
              color: "#0f0d0b",
              fontFamily: "'Trebuchet MS', sans-serif",
              margin: "4px",
              letterSpacing: "0.03em",
            }}
          >
            Explore
          </button>
        </div>
      </section>

      {/* ── PREVIEW CARDS ── */}
    </div>
  );
}
