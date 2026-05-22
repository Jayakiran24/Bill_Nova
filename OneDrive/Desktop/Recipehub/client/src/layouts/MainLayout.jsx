import { Outlet } from "react-router-dom";
import NAvbar from "../components/navbar/NAvbar";
import Footer from "../components/footer/Footer";

function MainLayout() {
  return (
    <>
      <NAvbar />

      <main>
        <Outlet />
      </main>

      <Footer />
    </>
  );
}

export default MainLayout;
