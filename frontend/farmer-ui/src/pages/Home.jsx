import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Home.css";

function Home() {
  const { language } = useLanguage();
  const te = language === "te";
  const navigate = useNavigate();

  return (
    <div className="home-wrapper">
      <section className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-title">🌾 {te ? "రైతు నుండి వినియోగదారునికి మార్కెట్‌ప్లేస్" : "Farmer to Consumer Marketplace"}</h1>
          <p className="home-subtitle">
            {te ? "రైతులు మరియు వినియోగదారులను" : "Connecting farmers and consumers through "}
            <span className="highlight">{te ? " AI ఆధారిత ధర నిర్ణయం " : " AI-powered pricing"}</span>
            {te ? "మరియు పారదర్శక ప్రత్యక్ష వాణిజ్యంతో కలుపుతున్నాం." : "and transparent direct trade."}
          </p>

          <div className="home-buttons">
            <button className="primary-button large" onClick={() => navigate("/login")}>
              {te ? "ప్రారంభించండి" : "Get Started"}
            </button>
            <button className="outline-button large" onClick={() => navigate("/register")}>
              {te ? "ఖాతా సృష్టించండి" : "Create Account"}
            </button>
          </div>
        </div>

        <div className="home-hero-badge">
          <span>🚀 {te ? "స్మార్ట్ వ్యవసాయ వేదిక" : "Smart Agriculture Platform"}</span>
        </div>
      </section>

      <section className="home-features">
        <h2 className="section-title">{te ? "ఎందుకు మా వేదికను ఎంచుకోవాలి?" : "Why Choose Our Platform?"}</h2>

        <div className="home-features-grid">
          <div className="home-feature-card">
            <div className="feature-icon">🚜</div>
            <h3>{te ? "రైతులకు శక్తివంతం" : "Empowering Farmers"}</h3>
            <p>{te ? "మధ్యవర్తులను తొలగించి ప్రత్యక్ష మార్కెట్ ద్వారా లాభాలు పెంచుకోండి." : "Eliminate middlemen and maximize profits through direct market access."}</p>
          </div>

          <div className="home-feature-card">
            <div className="feature-icon">🛒</div>
            <h3>{te ? "నమ్మకమైన వినియోగదారులు" : "Trusted Consumers"}</h3>
            <p>{te ? "స్థానిక ధృవీకరించిన ఫారాల నుండి తాజా ఉత్పత్తులు నేరుగా పొందండి." : "Access fresh, organic produce directly from verified local farms."}</p>
          </div>

          <div className="home-feature-card">
            <div className="feature-icon">🤖</div>
            <h3>{te ? "AI ఆధారిత ధరలు" : "AI-Driven Pricing"}</h3>
            <p>{te ? "తాజాదనం, డిమాండ్, సీజన్ ఆధారంగా డైనమిక్ ధర నిర్ణయం." : "Dynamic pricing powered by freshness detection, demand analysis, and seasonal insights."}</p>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>🌱 {te ? "సాంకేతికతతో స్థిరమైన వ్యవసాయానికి తోడ్పాటు" : "Empowering sustainable agriculture with technology"}</p>
        <span>© 2026 Farmer to Consumer. {te ? "అన్ని హక్కులు రిజర్వ్." : "All rights reserved."}</span>
      </footer>
    </div>
  );
}

export default Home;

