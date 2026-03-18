import { useNavigate } from "react-router-dom";

import OnboardingGuide from "../components/OnboardingGuide";
import "../styles/Dashboard.css";
import { isConsumer, isFarmer } from "../utils/auth";

function Dashboard() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    navigate("/");
  };

  const quickActions = [
    { title: "Products", copy: "Browse marketplace inventory and explore listed produce.", cta: "View Products", route: "/products", icon: "Crates" },
    ...(isFarmer() ? [{ title: "Incoming Orders", copy: "Review new customer demand and move orders through dispatch.", cta: "View Orders", route: "/farmer-orders", icon: "Routes" }] : []),
    ...(isConsumer() ? [{ title: "My Orders", copy: "Track purchases, delivery progress, and order history in one place.", cta: "View Orders", route: "/orders", icon: "Basket" }] : []),
    { title: "Profile", copy: "Update account preferences, warehouse base, and personal details.", cta: "View Profile", route: "/profile", icon: "Profile" },
  ];

  return (
    <div className="dashboard-container refined">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">Smart Agri Console</span>
          <h1>Farmer to Consumer Marketplace</h1>
          <p>
            Manage products, direct trade, live order flow, and delivery intelligence from one polished workspace built for both growers and buyers.
          </p>
          <div className="hero-actions">
            <button className="hero-primary" onClick={() => navigate("/products")}>Explore Inventory</button>
            <OnboardingGuide role={isFarmer() ? "farmer" : "consumer"} />
            <button className="hero-secondary" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="dashboard-hero-stats">
          <div className="hero-stat-card">
            <span>Marketplace Mode</span>
            <strong>{isFarmer() ? "Farmer Workspace" : "Consumer Workspace"}</strong>
          </div>
          <div className="hero-stat-card accent">
            <span>Operational Focus</span>
            <strong>{isFarmer() ? "Inventory + Fulfillment" : "Discovery + Tracking"}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-section-head">
        <div>
          <h2>Quick Actions</h2>
          <p>Jump into the workflows you are most likely to use next.</p>
        </div>
      </div>

      <div className="dashboard-grid refined-grid">
        {quickActions.map((item, index) => (
          <div className="dashboard-card refined-card" key={item.title} style={{ animationDelay: `${index * 80}ms` }}>
            <div className="card-icon-badge">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
            <button onClick={() => navigate(item.route)}>{item.cta}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
