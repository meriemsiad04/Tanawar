import Navbar from "../Components/layoutC/Navbar.jsx";
import Footer from "../Components/layoutC/Footer.jsx";

/**
 * Public layout: landing navbar + footer around the page.
 * Takes `children` for now (no router installed yet); swap to <Outlet /> when react-router is added.
 */
export default function PublicLayout({ children }) {
  return (
    <div id="top" className="flex min-h-screen flex-col bg-bg">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
