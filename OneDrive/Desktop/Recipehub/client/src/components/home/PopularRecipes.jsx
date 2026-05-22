import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
const RECIPES = [
  {
    id: 1,
    title: "Nordic Salmon Bowl",
    tags: ["Healthy", "Seafood"],
    time: "15 min",
    trending: true,
    img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
  },
  {
    id: 2,
    title: "Truffle Mushroom Pasta",
    tags: ["Italian", "Vegetarian"],
    time: "25 min",
    trending: false,
    img: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80",
  },
  {
    id: 3,
    title: "Wagyu Beef Tataki",
    tags: ["Japanese", "Premium"],
    time: "30 min",
    trending: true,
    img: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",
  },
  {
    id: 4,
    title: "Miso Glazed Aubergine",
    tags: ["Vegan", "Asian"],
    time: "20 min",
    trending: false,
    img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  },
  {
    id: 5,
    title: "Saffron Lobster Bisque",
    tags: ["Seafood", "Gourmet"],
    time: "45 min",
    trending: true,
    img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80",
  },
  {
    id: 6,
    title: "Nordic Salmon Bowl",
    tags: ["Healthy", "Seafood"],
    time: "15 min",
    trending: true,
    img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
  },
  {
    id: 7,
    title: "Truffle Mushroom Pasta",
    tags: ["Italian", "Vegetarian"],
    time: "25 min",
    trending: false,
    img: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&q=80",
  },
  {
    id: 8,
    title: "Wagyu Beef Tataki",
    tags: ["Japanese", "Premium"],
    time: "30 min",
    trending: true,
    img: "https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",
  },
  {
    id: 9,
    title: "Miso Glazed Aubergine",
    tags: ["Vegan", "Asian"],
    time: "20 min",
    trending: false,
    img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  },
  {
    id: 10,
    title: "Saffron Lobster Bisque",
    tags: ["Seafood", "Gourmet"],
    time: "45 min",
    trending: true,
    img: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80",
  },
];

export default function PopularRecipes() {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <section className="bg-[#0f0d0b] py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="px-5 mb-6">
          <h2 className="text-2xl font-bold text-[#f5f0ea]">
            Trending Recipes
          </h2>

          <p className="text-sm text-[#6b6259]">
            Hand-picked seasonal inspirations
          </p>
        </div>

        <Swiper
          modules={[Navigation, Autoplay]}
          navigation
          spaceBetween={16}
          slidesPerView={"auto"}
          className="px-5"
          autoplay={{
            delay: 2500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          loop={true}
          className="px-5"
        >
          {RECIPES.map((recipe) => (
            <SwiperSlide key={recipe.id} className="!w-[280px]">
              <div
                onClick={() => navigate(`/recipes/${recipe.id}`)}
                onMouseEnter={() => setHoveredId(recipe.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                overflow-hidden
                rounded-2xl
                bg-[#1a1612]
                border
                cursor-pointer
                transition-all
                duration-300
                ${
                  hoveredId === recipe.id
                    ? "border-[#e8a04a]/40 shadow-2xl -translate-y-1"
                    : "border-white/10"
                }
              `}
              >
                <img
                  src={recipe.img}
                  alt={recipe.title}
                  className="h-80 w-full object-cover"
                />

                <div className="p-4">
                  <h3 className="text-white font-bold mb-2">{recipe.title}</h3>

                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-full bg-white/5 text-xs text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
