// src/pages/Booking/Booking.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CHEFS = [
  {
    id: 1,
    name: "Marco Bellini",
    cuisine: "Italian · French",
    rating: 4.9,
    bookings: 284,
    price: 180,
    img: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&q=80",
    tags: ["Michelin Star", "Fine Dining"],
  },
  {
    id: 2,
    name: "Aiko Tanaka",
    cuisine: "Japanese · Fusion",
    rating: 4.8,
    bookings: 196,
    price: 160,
    img: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&q=80",
    tags: ["Omakase", "Seasonal"],
  },
  {
    id: 3,
    name: "Sofia Reyes",
    cuisine: "Mediterranean · Spanish",
    rating: 4.9,
    bookings: 321,
    price: 150,
    img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80",
    tags: ["Plant-Based", "Award Winner"],
  },
];

const STEPS = ["Choose Chef", "Pick Date & Time", "Confirm"];

export default function Booking() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedChef, setSelectedChef] = useState(null);
  const [form, setForm] = useState({
    date: "",
    time: "",
    guests: "2",
    notes: "",
  });
  const [confirmed, setConfirmed] = useState(false);

  const chef = CHEFS.find((c) => c.id === selectedChef);

  const handleConfirm = () => setConfirmed(true);

  if (confirmed) {
    return (
      <div
        style={{
          background: "#0f0d0b",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="text-center px-6" style={{ maxWidth: "400px" }}>
          <div
            className="mx-auto mb-6 flex items-center justify-center w-16 h-16 rounded-full"
            style={{
              background: "rgba(232,160,74,0.15)",
              border: "2px solid #e8a04a",
            }}
          >
            <svg
              width="28"
              height="28"
              fill="none"
              stroke="#e8a04a"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                d="M20 6L9 17l-5-5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: "'Georgia', serif",
              color: "#f5f0ea",
              fontSize: "1.8rem",
              marginBottom: "12px",
            }}
          >
            Booking Confirmed!
          </h2>
          <p
            style={{
              color: "#9a8f85",
              fontSize: "0.9rem",
              lineHeight: 1.7,
              marginBottom: "8px",
            }}
          >
            <strong style={{ color: "#e8a04a" }}>{chef?.name}</strong> will
            arrive on <strong style={{ color: "#f5f0ea" }}>{form.date}</strong>{" "}
            at <strong style={{ color: "#f5f0ea" }}>{form.time}</strong> for{" "}
            <strong style={{ color: "#f5f0ea" }}>{form.guests} guests</strong>.
          </p>
          <p
            style={{
              color: "#6b6259",
              fontSize: "0.8rem",
              marginBottom: "32px",
            }}
          >
            A confirmation has been sent to your email.
          </p>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "12px 28px",
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
            Back to Home
          </button>
        </div>
      </div>
    );
  }

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
        style={{ minHeight: "240px", overflow: "hidden" }}
      >
        <img
          src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=1200&q=80"
          alt="Book a Chef"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.3 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(15,13,11,0.5), #0f0d0b)",
          }}
        />

        {/* Back button */}
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate(-1))}
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
          {step > 0 ? "Back" : "Home"}
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
            Private Dining Experience
          </p>
          <h1
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: "clamp(2rem, 6vw, 3rem)",
              fontWeight: "bold",
              color: "#f5f0ea",
              lineHeight: 1.15,
            }}
          >
            Book a Chef
          </h1>
        </div>
      </div>

      {/* ── STEP INDICATOR ── */}
      <div className="flex items-center justify-center gap-4 py-6 px-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                style={{
                  background: i <= step ? "#e8a04a" : "rgba(255,255,255,0.06)",
                  color: i <= step ? "#0f0d0b" : "#6b6259",
                  border:
                    i <= step ? "none" : "1px solid rgba(255,255,255,0.1)",
                  transition: "all 0.3s",
                }}
              >
                {i < step ? (
                  <svg
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: i === step ? "#f5f0ea" : "#6b6259",
                }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: "32px",
                  height: "1px",
                  background: i < step ? "#e8a04a" : "rgba(255,255,255,0.1)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-20">
        {/* ── STEP 0: Choose Chef ── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            {CHEFS.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedChef(c.id)}
                className="flex gap-4 rounded-2xl cursor-pointer transition-all duration-200"
                style={{
                  background:
                    selectedChef === c.id
                      ? "rgba(232,160,74,0.08)"
                      : "rgba(255,255,255,0.03)",
                  border:
                    selectedChef === c.id
                      ? "1.5px solid rgba(232,160,74,0.5)"
                      : "1px solid rgba(255,255,255,0.07)",
                  padding: "16px",
                }}
              >
                <img
                  src={c.img}
                  alt={c.name}
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    flexShrink: 0,
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3
                        style={{
                          fontFamily: "'Georgia', serif",
                          color: "#f5f0ea",
                          fontSize: "1.05rem",
                        }}
                      >
                        {c.name}
                      </h3>
                      <p
                        style={{
                          color: "#9a8f85",
                          fontSize: "0.8rem",
                          marginTop: "2px",
                        }}
                      >
                        {c.cuisine}
                      </p>
                    </div>
                    <span
                      style={{
                        color: "#e8a04a",
                        fontFamily: "'Georgia', serif",
                        fontSize: "0.95rem",
                      }}
                    >
                      ${c.price}
                      <span style={{ color: "#6b6259", fontSize: "0.7rem" }}>
                        /hr
                      </span>
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: "0.65rem",
                          color: "#e8a04a",
                          background: "rgba(232,160,74,0.1)",
                          border: "1px solid rgba(232,160,74,0.2)",
                          borderRadius: "20px",
                          padding: "2px 8px",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mt-2">
                    <svg
                      width="12"
                      height="12"
                      fill="#e8a04a"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span style={{ color: "#9a8f85", fontSize: "0.75rem" }}>
                      {c.rating} · {c.bookings} bookings
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button
              disabled={!selectedChef}
              onClick={() => setStep(1)}
              style={{
                marginTop: "8px",
                padding: "14px",
                borderRadius: "14px",
                background: selectedChef
                  ? "linear-gradient(135deg, #e8a04a, #c97c28)"
                  : "rgba(255,255,255,0.05)",
                border: "none",
                color: selectedChef ? "#0f0d0b" : "#4a4540",
                fontWeight: "bold",
                fontSize: "0.95rem",
                cursor: selectedChef ? "pointer" : "not-allowed",
                letterSpacing: "0.03em",
                transition: "all 0.2s",
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 1: Date & Time ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            {/* Selected chef recap */}
            {chef && (
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  background: "rgba(232,160,74,0.07)",
                  border: "1px solid rgba(232,160,74,0.2)",
                }}
              >
                <img
                  src={chef.img}
                  alt={chef.name}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    objectFit: "cover",
                  }}
                />
                <div>
                  <p
                    style={{
                      color: "#f5f0ea",
                      fontSize: "0.9rem",
                      fontFamily: "'Georgia', serif",
                    }}
                  >
                    {chef.name}
                  </p>
                  <p style={{ color: "#9a8f85", fontSize: "0.75rem" }}>
                    {chef.cuisine}
                  </p>
                </div>
                <span
                  style={{
                    marginLeft: "auto",
                    color: "#e8a04a",
                    fontFamily: "'Georgia', serif",
                  }}
                >
                  ${chef.price}/hr
                </span>
              </div>
            )}

            {/* Form fields */}
            {[
              { label: "Date", type: "date", key: "date" },
              { label: "Time", type: "time", key: "time" },
            ].map(({ label, type, key }) => (
              <div key={key}>
                <label
                  style={{
                    color: "#9a8f85",
                    fontSize: "0.8rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f5f0ea",
                    fontSize: "0.9rem",
                    outline: "none",
                    fontFamily: "'Trebuchet MS', sans-serif",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            {/* Guests */}
            <div>
              <label
                style={{
                  color: "#9a8f85",
                  fontSize: "0.8rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Guests
              </label>
              <div className="flex gap-3">
                {["1", "2", "4", "6", "8+"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setForm((f) => ({ ...f, guests: g }))}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "10px",
                      background:
                        form.guests === g
                          ? "#e8a04a"
                          : "rgba(255,255,255,0.04)",
                      border:
                        form.guests === g
                          ? "none"
                          : "1px solid rgba(255,255,255,0.1)",
                      color: form.guests === g ? "#0f0d0b" : "#9a8f85",
                      fontWeight: form.guests === g ? "bold" : "normal",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      transition: "all 0.2s",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                style={{
                  color: "#9a8f85",
                  fontSize: "0.8rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Special Requests (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Dietary restrictions, occasion, preferences..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#f5f0ea",
                  fontSize: "0.875rem",
                  outline: "none",
                  resize: "none",
                  fontFamily: "'Trebuchet MS', sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              disabled={!form.date || !form.time}
              onClick={() => setStep(2)}
              style={{
                padding: "14px",
                borderRadius: "14px",
                background:
                  form.date && form.time
                    ? "linear-gradient(135deg, #e8a04a, #c97c28)"
                    : "rgba(255,255,255,0.05)",
                border: "none",
                color: form.date && form.time ? "#0f0d0b" : "#4a4540",
                fontWeight: "bold",
                fontSize: "0.95rem",
                cursor: form.date && form.time ? "pointer" : "not-allowed",
                letterSpacing: "0.03em",
                transition: "all 0.2s",
              }}
            >
              Review Booking →
            </button>
          </div>
        )}

        {/* ── STEP 2: Confirm ── */}
        {step === 2 && chef && (
          <div className="flex flex-col gap-5">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(232,160,74,0.2)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                style={{
                  padding: "20px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p
                  style={{
                    color: "#9a8f85",
                    fontSize: "0.75rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: "14px",
                  }}
                >
                  Booking Summary
                </p>
                {[
                  { label: "Chef", value: chef.name },
                  { label: "Date", value: form.date },
                  { label: "Time", value: form.time },
                  { label: "Guests", value: form.guests },
                  ...(form.notes
                    ? [{ label: "Notes", value: form.notes }]
                    : []),
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-start py-2"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <span style={{ color: "#6b6259", fontSize: "0.85rem" }}>
                      {label}
                    </span>
                    <span
                      style={{
                        color: "#f5f0ea",
                        fontSize: "0.85rem",
                        textAlign: "right",
                        maxWidth: "200px",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="flex justify-between items-center"
                style={{ padding: "16px 20px" }}
              >
                <span style={{ color: "#9a8f85", fontSize: "0.85rem" }}>
                  Estimated (3 hrs)
                </span>
                <span
                  style={{
                    color: "#e8a04a",
                    fontFamily: "'Georgia', serif",
                    fontSize: "1.2rem",
                  }}
                >
                  ${chef.price * 3}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #e8a04a, #c97c28)",
                border: "none",
                color: "#0f0d0b",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              Confirm Booking
            </button>

            <p
              style={{
                color: "#6b6259",
                fontSize: "0.75rem",
                textAlign: "center",
              }}
            >
              Free cancellation up to 24 hours before your booking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
