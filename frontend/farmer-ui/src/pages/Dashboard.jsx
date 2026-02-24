import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <div className="navbar">
        <h1>🏠 Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <div className="dashboard-content">
        <h2 className="dashboard-title">Welcome to Your Dashboard</h2>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>📦 Products</h3>
            <p>Browse and manage available products</p>
            <div className="card-stat">0</div>
            <button className="action-button" onClick={() => navigate("/products")}>
              View Products
            </button>
          </div>

          <div className="dashboard-card">
            <h3>➕ Add Product</h3>
            <p>Add a new product to your inventory</p>
            <p style={{ fontSize: "0.9rem", color: "#999" }}>Farmers only</p>
            <button className="action-button" onClick={() => navigate("/add-product")}>
              Add Product
            </button>
          </div>

          <div className="dashboard-card">
            <h3>🛒 My Orders</h3>
            <p>Track your orders and purchases</p>
            <div className="card-stat">0</div>
            <button className="action-button secondary-button">
              View Orders
            </button>
          </div>

          <div className="dashboard-card">
            <h3>👤 Profile</h3>
            <p>Manage your account settings</p>
            <button className="action-button secondary-button">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;