import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

const CHEFS = [
  {
    id: 1,
    name: "Chef Marco Rossi",
    specialty: "Italian Modernist",
    rating: 4.9,
    sessions: 312,
    img: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500&q=80",
    badge: "⭐ Top Rated",
  },
  {
    id: 2,
    name: "Chef Amara Diallo",
    specialty: "West African Fusion",
    rating: 4.8,
    sessions: 198,
    img: "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=500&q=80",
    badge: "🔥 Trending",
  },
  {
    id: 3,
    name: "Chef Yuki Tanaka",
    specialty: "Omakase & Kaiseki",
    rating: 5.0,
    sessions: 421,
    img: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=500&q=80",
    badge: "✦ Master",
  },
  {
    id: 4,
    name: "Chef Sofia Herrera",
    specialty: "Modern Mexican",
    rating: 4.7,
    sessions: 154,
    img: "https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=500&q=80",
    badge: "🌟 Rising",
  },
  {
    id: 5,
    name: "Chef Luca Ferreira",
    specialty: "French Haute Cuisine",
    rating: 4.9,
    sessions: 289,
    img: "https://images.unsplash.com/photo-1583394293214-0b3f9c2b9e5f?w=500&q=80",
    badge: "⭐ Top Rated",
  },
  {
    id: 6,
    name: "Chef Priya Nair",
    specialty: "Progressive Indian",
    rating: 4.8,
    sessions: 176,
    img: "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=500&q=80",
    badge: "🔥 Trending",
  },
  {
    id: 7,
    name: "Chef James Okafor",
    specialty: "Pan-African Grill",
    rating: 4.6,
    sessions: 132,
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&q=80",
    badge: "🌟 Rising",
  },
  {
    id: 8,
    name: "Chef Elena Vasquez",
    specialty: "Spanish Molecular",
    rating: 4.9,
    sessions: 267,
    img: "https://images.unsplash.com/photo-1574966739987-65a8b4e5ff8b?w=500&q=80",
    badge: "✦ Master",
  },
];

export default function FeaturedChefs() {
  const navigate = useNavigate();

  return (
    <section className="bg-[#0f0d0b] py-12 px-4">
      <div className="max-w-7xl mx-auto px-6">
        <Swiper
          modules={[Navigation, Autoplay]}
          navigation
          loop
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
          }}
          spaceBetween={24}
          breakpoints={{
            320: {
              slidesPerView: 1,
            },
            768: {
              slidesPerView: 2,
            },
            1024: {
              slidesPerView: 3,
            },
          }}
        >
          {CHEFS.map((chef) => (
            <SwiperSlide key={chef.id}>
              <div
                onClick={() => navigate(`/chefs/${chef.id}`)}
                className="
              bg-[#181818]
              rounded-[32px]
              p-6
              h-[420px]
              border border-white/5
              hover:border-[#e8a04a]/30
              transition-all duration-300
              cursor-pointer
              flex flex-col justify-between
            "
              >
                {/* Chef Image */}
                <div className="flex justify-center">
                  <img
                    src={chef.img}
                    alt={chef.name}
                    className="
                  w-36 h-36
                  rounded-full
                  object-cover
                  border-2 border-[#e8a04a]/30
                "
                  />
                </div>

                {/* Chef Info */}
                <div className="text-center">
                  <h3 className="text-white text-xl font-bold mb-2">
                    {chef.name}
                  </h3>

                  <p className="text-[#e8a04a] text-sm mb-3">
                    {chef.specialty}
                  </p>

                  <span className="text-xs text-gray-400">{chef.badge}</span>
                </div>

                {/* Stats */}
                <div className="flex justify-center gap-8">
                  <div className="text-center">
                    <p className="text-white font-bold">{chef.rating}</p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>

                  <div className="text-center">
                    <p className="text-white font-bold">{chef.sessions}</p>
                    <p className="text-xs text-gray-500">Sessions</p>
                  </div>
                </div>

                {/* Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/booking");
                  }}
                  className="
                w-full
                py-3
                rounded-full
                bg-[#e8a04a]
                text-black
                font-semibold
                hover:brightness-110
                transition
              "
                >
                  Book Session
                </button>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
