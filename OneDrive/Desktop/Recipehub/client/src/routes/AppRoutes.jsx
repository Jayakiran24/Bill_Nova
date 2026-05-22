// src/routes/AppRoutes.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/Home/Home";
import MainLayout from "../layouts/MainLayout";
import Chefs from "../pages/Chefs/Chefs";
import Booking from "../pages/Booking/Booking";

// Pages

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* All routes share Navbar + Footer via MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Routes>
            <Route path="/chefs" element={<Chefs />} />
            <Route path="/booking" element={<Booking />} />{" "}
            {/* ← Book a Chef */}
          </Routes>
          {/* <Route path="/order" element={<Order />} /> */}
          {/* <Route path="/Booking" element={<Booking />} /> */}
          {/* <Route path="/chefs/:id"      element={<ChefDetails />} /> */}
          {/* <Route path="/favorites"      element={<Favorites />} /> */}
          {/* <Route path="/planner"        element={<Planner />} /> */}
          {/* <Route path="/recipes"        element={<Recipes />} /> */}
          {/* <Route path="/recipes/:id"    element={<RecipeDetails />} /> */}
          {/* <Route path="/categories"     element={<Categories />} /> */}
          {/* ← Order Food  */}
          {/* <Route path="/login"          element={<Login />} /> */}
          {/* <Route path="/register"       element={<Register />} /> */}
          {/* <Route path="/about"          element={<About />} /> */}
          {/* <Route path="/contact"        element={<Contact />} /> */}
          {/* <Route path="/dashboard"      element={<Dashboard />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
