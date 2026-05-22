import React from "react";
import HeroSection from "../../components/home/HeroSection";
import NAvbar from "../../components/navbar/NAvbar";
import Footer from "../../components/footer/Footer";
import CategoriesSection from "../../components/home/CategoriesSection";
import PopularRecipes from "../../components/home/PopularRecipes";
import StatsSection from "../../components/home/StatsSection";
import FeaturedChefs from "../../components/home/FeacturedChefs";
import TestimonialSlider from "../../components/home/Testimonials";

const Home = () => {
  return (
    <div>
      <NAvbar />
      <HeroSection />
      <CategoriesSection />
      <PopularRecipes />
      <StatsSection />
      <FeaturedChefs />
      <TestimonialSlider />
      <Footer />
    </div>
  );
};

export default Home;
