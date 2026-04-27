import { useNavigate } from "react-router-dom";

import OnboardingGuide from "../components/OnboardingGuide";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Dashboard.css";
import { isConsumer, isFarmer } from "../utils/auth";

function Dashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    navigate("/");
  };

  const quickActions = [
    {
      title: t("dashboardProductsTitle", "Products"),
      copy: t("dashboardProductsCopy", "Browse marketplace inventory and explore listed produce."),
      cta: t("dashboardProductsCta", "View Products"),
      route: "/products",
      icon: "Crates",
    },
    ...(isFarmer() ? [{
      title: t("dashboardIncomingOrdersTitle", "Incoming Orders"),
      copy: t("dashboardIncomingOrdersCopy", "Review new customer demand and move orders through dispatch."),
      cta: t("dashboardIncomingOrdersCta", "View Orders"),
      route: "/farmer-orders",
      icon: "Routes",
    }] : []),
    ...(isConsumer() ? [{
      title: t("dashboardMyOrdersTitle", "My Orders"),
      copy: t("dashboardMyOrdersCopy", "Track purchases, delivery progress, and order history in one place."),
      cta: t("dashboardMyOrdersCta", "View Orders"),
      route: "/orders",
      icon: "Basket",
    }] : []),
    {
      title: t("dashboardProfileTitle", "Profile"),
      copy: t("dashboardProfileCopy", "Update account preferences, warehouse base, and personal details."),
      cta: t("dashboardProfileCta", "View Profile"),
      route: "/profile",
      icon: "Profile",
    },
  ];

  return (
    <div className="dashboard-container refined">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">{t("dashboardEyebrow", "Smart Agri Console")}</span>
          <h1>{t("dashboardTitle", "Farmer to Consumer Marketplace")}</h1>
          <p>
            {t("dashboardSubtitle", "Manage products, direct trade, live order flow, and delivery intelligence from one polished workspace built for both growers and buyers.")}
          </p>
          <div className="hero-actions">
            <button className="hero-primary" onClick={() => navigate("/products")}>{t("dashboardExploreInventory", "Explore Inventory")}</button>
            <OnboardingGuide role={isFarmer() ? "farmer" : "consumer"} initialLang={language} />
            <button className="hero-secondary" onClick={logout}>{t("navLogout", "Logout")}</button>
          </div>
        </div>

        <div className="dashboard-hero-stats">
          <div className="hero-stat-card">
            <span>{t("dashboardMarketplaceMode", "Marketplace Mode")}</span>
            <strong>{isFarmer() ? t("dashboardFarmerWorkspace", "Farmer Workspace") : t("dashboardConsumerWorkspace", "Consumer Workspace")}</strong>
          </div>
          <div className="hero-stat-card accent">
            <span>{t("dashboardOperationalFocus", "Operational Focus")}</span>
            <strong>{isFarmer() ? t("dashboardFocusFarmer", "Inventory + Fulfillment") : t("dashboardFocusConsumer", "Discovery + Tracking")}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-section-head">
        <div>
          <h2>{t("dashboardQuickActions", "Quick Actions")}</h2>
          <p>{t("dashboardQuickActionsCopy", "Jump into the workflows you are most likely to use next.")}</p>
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
