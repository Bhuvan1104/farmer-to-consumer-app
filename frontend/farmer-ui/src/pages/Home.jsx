import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="hero-section">
          <h1 className="hero-title">🌾 Farmer to Consumer</h1>
          <p className="hero-subtitle">
            Connect directly with local farmers and fresh products
          </p>
        </div>

        <div className="features-section">
          <div className="feature-card">
            <div className="feature-icon">🚜</div>
            <h3>For Farmers</h3>
            <p>Sell your fresh produce directly to consumers</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛒</div>
            <h3>For Consumers</h3>
            <p>Buy fresh, organic products directly from farms</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💚</div>
            <h3>Support Local</h3>
            <p>Build community and support sustainable farming</p>
          </div>
        </div>

        <div className="cta-buttons">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </div>

        <div className="footer-text">
          <p>Join our community today and start your journey!</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
