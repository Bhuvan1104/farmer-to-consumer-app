import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import { isFarmer, isConsumer } from "../utils/auth";
function Dashboard() {
  const navigate = useNavigate();

  const logout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_role"); // 🔥 important
  navigate("/");
};

  return (
    <div className="dashboard-container">
      
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h1>🚜 Farmer–Consumer Platform</h1>
          <p className="subtitle">AI Powered Direct Trade Marketplace</p>
        </div>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="dashboard-content">
        <h2 className="welcome-text">Welcome Back 👋</h2>

        <div className="dashboard-grid">

  {/* Visible to Both */}
  <div className="dashboard-card">
    <div className="icon">📦</div>
    <h3>Products</h3>
    <p>Browse available products</p>
    <button onClick={() => navigate('/products')}>
      View Products
    </button>
  </div>

  {/* Farmer Only */}
  {isFarmer() && (
    <div className="dashboard-card">
      <div className="icon">➕</div>
      <h3>Add Product</h3>
      <p>Add new product to inventory</p>
      <button onClick={() => navigate('/add-product')}>
        Add Product
      </button>
    </div>
  )}

  {/* Consumer Only */}
  {isConsumer() && (
    <div className="dashboard-card">
      <div className="icon">🛒</div>
      <h3>Orders</h3>
      <p>Track your purchases</p>
      <button onClick={() => navigate('/orders')}>
        View Orders
      </button>
    </div>
  )}

  {/* Both can view profile */}
  <div className="dashboard-card">
    <div className="icon">👤</div>
    <h3>Profile</h3>
    <p>Manage account settings</p>
    <button onClick={() => navigate('/profile')}>
      View Profile
    </button>
  </div>

</div>
      </div>
    </div>
  );
}

export default Dashboard;