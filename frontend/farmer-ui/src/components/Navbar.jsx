import { NavLink, useNavigate } from "react-router-dom";
import { isFarmer, isConsumer } from "../utils/auth";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    navigate("/");
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
            <NavLink to="/chat-history" className="nav-item">Chat History</NavLink>
          </>
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