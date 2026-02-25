import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-wrapper">

      {/* HERO SECTION */}
      <div className="home-hero-card">
        <h1 className="home-title">🌾 Farmer to Consumer</h1>
        <p className="home-subtitle">
          AI-Powered Direct Marketplace Connecting Farmers & Consumers
        </p>

        <div className="home-buttons">
          <button
            className="primary-button large"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

          <button
            className="secondary-button large"
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div className="home-features-grid">

        <div className="home-feature-card">
          <div className="feature-icon">🚜</div>
          <h3>For Farmers</h3>
          <p>Sell fresh produce directly without middlemen</p>
        </div>

        <div className="home-feature-card">
          <div className="feature-icon">🛒</div>
          <h3>For Consumers</h3>
          <p>Buy organic products directly from trusted farms</p>
        </div>

        <div className="home-feature-card">
          <div className="feature-icon">🤖</div>
          <h3>AI Powered Pricing</h3>
          <p>Smart pricing based on freshness & demand</p>
        </div>

      </div>

      {/* FOOTER */}
      <div className="home-footer">
        <p>🌱 Empowering local agriculture with technology</p>
      </div>

    </div>
  );
}

export default Home;