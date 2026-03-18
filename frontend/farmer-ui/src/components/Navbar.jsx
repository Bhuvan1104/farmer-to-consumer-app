import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import { getUserRole, isFarmer, isConsumer } from "../utils/auth";
import "./Navbar.css";


function Navbar() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

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

  const fetchCartCount = async () => {
  try {
    const res = await API.get("orders/cart/count/");
    setCartCount(res.data.count);
  } catch (err) {
    console.error("Cart count error:", err);
  }
};



  return (
    <nav className="navbar">

      {/* LEFT */}
      <div className="navbar-left">
        <NavLink to="/dashboard" className="logo">
          🌾 <span>FarmDirect</span>
        </NavLink>
      </div>

      {/* CENTER LINKS */}
      <div className="navbar-links">

        <NavLink to="/products" className="nav-item">Products</NavLink>
        <NavLink to="/profile" className="nav-item">Profile</NavLink>
        <NavLink to="/chatbot" className="nav-item">Chatbot</NavLink>

        {isFarmer() && (
          <>
            <NavLink to="/add-product" className="nav-item">Add Product</NavLink>
            <NavLink to="/delivery" className="nav-item">Delivery</NavLink>
            <NavLink to="/pricing" className="nav-item">Pricing</NavLink>
          </>
        )}

        {isConsumer() && (
          <>
            <NavLink to="/orders" className="nav-item">Orders</NavLink>
          </>
        )}

        {["consumer", "farmer"].includes(getUserRole()) && (
          <NavLink to="/chat-history" className="nav-item">Messages</NavLink>
        )}

        {isConsumer() && (
  <button
    className="nav-cart-btn"
    onClick={() => navigate("/cart")}
  >
    <span className="cart-icon">🛒</span>
    <span className="cart-text">Cart</span>

    {cartCount > 0 && (
      <span className="cart-badge">{cartCount}</span>
    )}
  </button>
)}

      </div>

      {/* RIGHT */}
      <div className="navbar-right">
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

    </nav>
  );
}

export default Navbar;
