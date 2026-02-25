import { Link, useNavigate } from "react-router-dom";
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

      <div className="navbar-left">
        <Link to="/dashboard" className="logo">
          🌾 FarmDirect
        </Link>
      </div>

      <div className="navbar-links">

        {/* Visible to both */}
        <Link to="/products">Products</Link>
        <Link to="/profile">Profile</Link>
        <Link to="/chatbot">Chatbot</Link>

        {/* Farmer Only */}
        {isFarmer() && (
          <>
            <Link to="/add-product">Add Product</Link>
            <Link to="/delivery">Delivery</Link>
            <Link to="/pricing">Pricing</Link>
          </>
        )}

        {/* Consumer Only */}
        {isConsumer() && (
          <>
            <Link to="/orders">Orders</Link>
            <Link to="/chat-history">Chat History</Link>
          </>
        )}

      </div>

      <div className="navbar-right">
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

    </nav>
  );
}

export default Navbar;