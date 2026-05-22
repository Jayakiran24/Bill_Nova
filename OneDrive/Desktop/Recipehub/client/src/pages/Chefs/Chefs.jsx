// src/pages/Order/Order.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const MENU_ITEMS = [
  {
    id: 1,
    name: "Truffle Risotto",
    desc: "Arborio rice, black truffle, parmesan, white wine reduction",
    price: 34,
    tag: "Chef's Pick",
    img: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80",
  },
  {
    id: 2,
    name: "Seared Duck Breast",
    desc: "Five-spice duck, cherry jus, roasted root vegetables",
    price: 42,
    tag: "Popular",
    img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
  },
  {
    id: 3,
    name: "Lobster Bisque",
    desc: "Atlantic lobster, cream, cognac, fresh tarragon",
    price: 28,
    tag: "Seasonal",
    img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
  },
  {
    id: 4,
    name: "Wagyu Beef Tenderloin",
    desc: "A5 wagyu, truffle butter, asparagus, red wine jus",
    price: 68,
    tag: "Premium",
    img: "https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80",
  },
];

export default function Chefs() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({});

  const addToCart = (id) =>
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

  const removeFromCart = (id) =>
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) next[id]--;
      else delete next[id];
      return next;
    });

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = MENU_ITEMS.find((m) => m.id === Number(id));
    return sum + (item?.price || 0) * qty;
  }, 0);

  return (
    <div
      style={{
        background: "#0f0d0b",
        minHeight: "100vh",
        fontFamily: "'Trebuchet MS', sans-serif",
      }}
    >
      {/* ── HERO BANNER ── */}
      <div
        className="relative flex flex-col items-center justify-center text-center px-6"
        style={{ minHeight: "260px", overflow: "hidden" }}
      >
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80"
          alt="Order Food"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.35 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(15,13,11,0.4), #0f0d0b)",
          }}
        />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-5 left-5 flex items-center gap-2 z-10"
          style={{
            color: "#9a8f85",
            fontSize: "0.85rem",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e8a04a")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9a8f85")}
        >
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>

        <div className="relative z-10">
          <p
            style={{
              color: "#e8a04a",
              fontSize: "0.75rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Fine Dining, Delivered
          </p>
          <h1
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: "clamp(2rem, 6vw, 3.2rem)",
              fontWeight: "bold",
              color: "#f5f0ea",
              lineHeight: 1.15,
            }}
          >
            Order Food
          </h1>
          <p
            style={{ color: "#9a8f85", marginTop: "10px", fontSize: "0.9rem" }}
          >
            Curated menus from the city's finest restaurants
          </p>
        </div>
      </div>

      {/* ── MENU GRID ── */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h2
          style={{
            fontFamily: "'Georgia', serif",
            color: "#f5f0ea",
            fontSize: "1.2rem",
            marginBottom: "20px",
            borderBottom: "1px solid rgba(232,160,74,0.15)",
            paddingBottom: "12px",
          }}
        >
          Today's Menu
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MENU_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                padding: "16px",
              }}
            >
              {/* Image */}
              <img
                src={item.img}
                alt={item.name}
                style={{
                  width: "90px",
                  height: "90px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  flexShrink: 0,
                }}
              />

              {/* Info */}
              <div className="flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: "#e8a04a",
                        background: "rgba(232,160,74,0.12)",
                        border: "1px solid rgba(232,160,74,0.25)",
                        borderRadius: "20px",
                        padding: "2px 8px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Georgia', serif",
                      color: "#f5f0ea",
                      fontSize: "1rem",
                      marginBottom: "4px",
                    }}
                  >
                    {item.name}
                  </h3>
                  <p
                    style={{
                      color: "#6b6259",
                      fontSize: "0.78rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>

                {/* Price + Add/Remove */}
                <div className="flex items-center justify-between mt-3">
                  <span
                    style={{
                      color: "#e8a04a",
                      fontFamily: "'Georgia', serif",
                      fontSize: "1rem",
                    }}
                  >
                    ${item.price}
                  </span>

                  {cart[item.id] ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: "rgba(232,160,74,0.12)",
                          border: "1px solid rgba(232,160,74,0.3)",
                          color: "#e8a04a",
                          fontSize: "1rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          color: "#f5f0ea",
                          minWidth: "16px",
                          textAlign: "center",
                        }}
                      >
                        {cart[item.id]}
                      </span>
                      <button
                        onClick={() => addToCart(item.id)}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: "#e8a04a",
                          border: "none",
                          color: "#0f0d0b",
                          fontSize: "1rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                        }}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item.id)}
                      style={{
                        padding: "6px 16px",
                        borderRadius: "20px",
                        background: "linear-gradient(135deg, #e8a04a, #c97c28)",
                        border: "none",
                        color: "#0f0d0b",
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                        cursor: "pointer",
                        letterSpacing: "0.03em",
                      }}
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FLOATING CART BAR ── */}
      {totalItems > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-6 px-6 py-4 rounded-2xl"
          style={{
            background: "#1a1410",
            border: "1px solid rgba(232,160,74,0.3)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
            minWidth: "300px",
            maxWidth: "90vw",
            backdropFilter: "blur(12px)",
          }}
        >
          <div>
            <p style={{ color: "#9a8f85", fontSize: "0.75rem" }}>
              {totalItems} item{totalItems > 1 ? "s" : ""}
            </p>
            <p
              style={{
                color: "#f5f0ea",
                fontFamily: "'Georgia', serif",
                fontSize: "1.1rem",
              }}
            >
              ${totalPrice}
            </p>
          </div>
          <button
            style={{
              padding: "10px 24px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #e8a04a, #c97c28)",
              border: "none",
              color: "#0f0d0b",
              fontWeight: "bold",
              fontSize: "0.875rem",
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
          >
            Checkout →
          </button>
        </div>
      )}
    </div>
  );
}
