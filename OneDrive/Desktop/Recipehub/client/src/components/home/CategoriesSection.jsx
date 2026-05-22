// src/components/home/ServiceCards.jsx
import { useNavigate } from "react-router-dom";
const CARDS = [
  {
    id: "booking",
    path: "/booking",
    title: "Order Food",
    description:
      "Curated menus from the city's finest restaurants, delivered in premium sustainable packaging.",
    img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
  },
  {
    id: "chefs",
    path: "/chefs",
    title: "Book a Chef",
    description:
      "Invite a culinary master to your home for a personalized, five-star cooking experience.",
    img: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&q=80",
  },
];

export default function CategoriesSection() {
  const navigate = useNavigate();

  return (
    <section
      className="px-4 py-10 flex flex-col gap-30 max-w-lg mx-auto md:max-w-full md:flex-row justify-center"
      style={{ background: "#0f0d0b" }}
    >
      {CARDS.map((card) => (
        <div
          key={card.id}
          onClick={() => navigate(card.path)}
          className="relative overflow-hidden cursor-pointer group  w-full md:w-[550px] "
          style={{
            borderRadius: "20px",
            minHeight: "220px",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 24px 60px rgba(0,0,0,0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.6)";
          }}
        >
          {/* Background image */}
          <img
            src={card.img}
            alt={card.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ display: "block" }}
          />

          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(160deg, rgba(10,8,6,0.72) 0%, rgba(10,8,6,0.55) 50%, rgba(10,8,6,0.3) 100%)",
            }}
          />

          {/* Gold accent border on hover */}
          <div
            className="absolute inset-0 rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{
              border: "1.5px solid rgba(232,160,74,0.35)",
              borderRadius: "20px",
            }}
          />

          {/* Content */}
          <div
            className="relative z-10 p-6 flex flex-col justify-between h-full"
            style={{ minHeight: "220px" }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "'Georgia', serif",
                  fontSize: "clamp(1.6rem, 4vw, 2rem)",
                  fontWeight: "bold",
                  color: "#f5f0ea",
                  lineHeight: 1.2,
                  marginBottom: "12px",
                }}
              >
                {card.title}
              </h2>
              <p
                style={{
                  fontFamily: "'Trebuchet MS', sans-serif",
                  fontSize: "0.875rem",
                  color: "#b0a89e",
                  lineHeight: 1.65,
                  maxWidth: "260px",
                }}
              >
                {card.description}
              </p>
            </div>

            {/* Arrow CTA */}
            <div className="mt-6 flex items-center gap-2">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 group-hover:bg-opacity-100"
                style={{
                  background: "rgba(232,160,74,0.15)",
                  border: "1px solid rgba(232,160,74,0.4)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="#e8a04a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
