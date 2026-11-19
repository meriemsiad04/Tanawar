import PublicLayout from "./layouts/PublicLayout.jsx";
import LandingPage from "./pages/public/LandingPage.jsx";

// No router installed yet — the landing page is the only screen.
export default function App() {
  return (
    <PublicLayout>
      <LandingPage />
    </PublicLayout>
  );
}
