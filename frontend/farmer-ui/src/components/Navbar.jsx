import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import { getUserRole, isConsumer, isFarmer } from "../utils/auth";
import LanguageSelector from "./LanguageSelector";
import ThemeToggle from "./ThemeToggle";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const { t } = useLanguage();

  const fetchCartCount = async () => {
    try {
      const res = await API.get("orders/cart/count/");
      setCartCount(res.data.count);
    } catch (err) {
      console.error("Cart count error:", err);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    navigate("/");
  };

  useEffect(() => {
    fetchCartCount();

    const updateHandler = () => {
      fetchCartCount();
    };

    window.addEventListener("cartUpdated", updateHandler);
    return () => {
      window.removeEventListener("cartUpdated", updateHandler);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <NavLink to="/dashboard" className="logo">
          <span role="img" aria-label="logo">🌾</span> <span>FarmDirect</span>
        </NavLink>
      </div>

      <div className="navbar-links">
        <NavLink to="/products" className="nav-item">{t("navProducts", "Products")}</NavLink>
        <NavLink to="/profile" className="nav-item">{t("navProfile", "Profile")}</NavLink>
        <NavLink to="/chatbot" className="nav-item">{t("navChatbot", "Chatbot")}</NavLink>

        {isFarmer() && (
          <>
            <NavLink to="/add-product" className="nav-item">{t("navAddProduct", "Add Product")}</NavLink>
            <NavLink to="/delivery" className="nav-item">{t("navDelivery", "Delivery")}</NavLink>
            <NavLink to="/pricing" className="nav-item">{t("navPricing", "Pricing")}</NavLink>
          </>
        )}

        {isConsumer() && (
          <NavLink to="/orders" className="nav-item">{t("navOrders", "Orders")}</NavLink>
        )}

        {["consumer", "farmer"].includes(getUserRole()) && (
          <NavLink to="/chat-history" className="nav-item">{t("navMessages", "Messages")}</NavLink>
        )}

        {isConsumer() && (
          <button className="nav-cart-btn" onClick={() => navigate("/cart")}>
            <span className="cart-icon">🛒</span>
            <span className="cart-text">{t("navCart", "Cart")}</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        )}
      </div>

      <div className="navbar-right">
        <LanguageSelector />
        <ThemeToggle />
        <button className="logout-btn" onClick={logout}>
          {t("navLogout", "Logout")}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

