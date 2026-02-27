import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-wrapper">

      {/* HERO SECTION */}
      <section className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-title">
            🌾 Farmer to Consumer Marketplace
          </h1>

          <p className="home-subtitle">
            Connecting farmers and consumers through 
            <span className="highlight"> AI-powered pricing</span> 
            and transparent direct trade.
          </p>

          <div className="home-buttons">
            <button
              className="primary-button large"
              onClick={() => navigate("/login")}
            >
              Get Started
            </button>

            <button
              className="outline-button large"
              onClick={() => navigate("/register")}
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="home-hero-badge">
          <span>🚀 Smart Agriculture Platform</span>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="home-features">
        <h2 className="section-title">Why Choose Our Platform?</h2>

        <div className="home-features-grid">

          <div className="home-feature-card">
            <div className="feature-icon">🚜</div>
            <h3>Empowering Farmers</h3>
            <p>
              Eliminate middlemen and maximize profits through 
              direct market access.
            </p>
          </div>

          <div className="home-feature-card">
            <div className="feature-icon">🛒</div>
            <h3>Trusted Consumers</h3>
            <p>
              Access fresh, organic produce directly from 
              verified local farms.
            </p>
          </div>

          <div className="home-feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI-Driven Pricing</h3>
            <p>
              Dynamic pricing powered by freshness detection, 
              demand analysis, and seasonal insights.
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="home-footer">
        <p>🌱 Empowering sustainable agriculture with technology</p>
        <span>© 2026 Farmer to Consumer. All rights reserved.</span>
      </footer>

    </div>
  );
}

export default Home;