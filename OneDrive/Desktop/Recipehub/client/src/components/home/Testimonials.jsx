import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

const testimonials = [
  {
    id: 1,
    name: "Jonathan & Sophie",
    role: "Verified Foodies",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    review:
      "Recipe Hub transformed our anniversary dinner into an unforgettable Michelin-level experience. Having Chef Elena cook in our kitchen was pure magic.",
  },
  {
    id: 2,
    name: "Rahul Kumar",
    role: "Food Enthusiast",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
    review:
      "The chef booking experience was seamless. Restaurant-quality dishes at home and an amazing evening with friends.",
  },
  {
    id: 3,
    name: "Priya Sharma",
    role: "Verified Customer",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    review:
      "The recipes are easy to follow and incredibly delicious. I've learned so many new cooking techniques.",
  },
];

export default function TestimonialSlider() {
  return (
    <section className="bg-black py-16 px-4">
      <div className="max-w-md mx-auto">

        <Swiper
          modules={[Navigation, Autoplay]}
          navigation
          loop
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          slidesPerView={1}
        >
          {testimonials.map((item) => (
            <SwiperSlide key={item.id}>
              <div className="rounded-[32px] bg-[#181818] p-8 min-h-[500px] flex flex-col justify-between">

                {/* Quote */}
                <div>
                  <div className="text-center text-6xl text-[#f3b08a] font-bold mb-8">
                    "
                  </div>

                  <p className="text-center text-white text-2xl font-semibold italic leading-relaxed">
                    {item.review}
                  </p>
                </div>

                {/* User */}
                <div className="flex items-center justify-center gap-3 mt-10">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-full object-cover border border-orange-300"
                  />

                  <div>
                    <h4 className="text-white font-semibold text-sm">
                      {item.name}
                    </h4>

                    <p className="text-gray-400 text-xs">
                      {item.role}
                    </p>
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