import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/Pages.css";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await API.get("orders/");
      setOrders(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
      } else {
        setError("Failed to load orders");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders =
    filterStatus === "all"
      ? orders
      : orders.filter((order) => order.status === filterStatus);

  const getStatusColor = (status) => {
    const colors = {
      pending: "#FFA500",
      confirmed: "#4169E1",
      shipped: "#FF8C00",
      delivered: "#28A745",
      cancelled: "#DC3545",
    };
    return colors[status] || "#666";
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: "📋",
      confirmed: "✅",
      shipped: "🚚",
      delivered: "📦",
      cancelled: "❌",
    };
    return icons[status] || "❓";
  };

  if (loading) return <div className="page-container"><p>Loading orders...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📦 My Orders</h1>
        <p>Track and manage your orders</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filter-section">
        <label>Filter by Status:</label>
        <div className="filter-buttons">
          {["all", "pending", "confirmed", "shipped", "delivered"].map((status) => (
            <button
              key={status}
              className={`filter-button ${filterStatus === status ? "active" : ""}`}
              onClick={() => setFilterStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <p>No orders found</p>
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="order-card"
              onClick={() => navigate(`/order/${order.id}`)}
            >
              <div className="order-header">
                <h3>Order #{order.id}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {getStatusIcon(order.status)} {order.status.toUpperCase()}
                </span>
              </div>

              <div className="order-details">
                <div className="detail-row">
                  <span className="label">Product:</span>
                  <span className="value">{order.product?.name || "N/A"}</span>
                </div>

                <div className="detail-row">
                  <span className="label">Quantity:</span>
                  <span className="value">{order.quantity} units</span>
                </div>

                <div className="detail-row">
                  <span className="label">Total Price:</span>
                  <span className="value">${order.total_price?.toFixed(2)}</span>
                </div>

                <div className="detail-row">
                  <span className="label">Order Date:</span>
                  <span className="value">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="order-footer">
                <button className="view-button">View Details →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
