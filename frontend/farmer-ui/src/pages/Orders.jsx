import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import "../styles/Orders.css";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const navigate = useNavigate();
  const location = useLocation();

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

  // Filtering logic
  const filteredOrders =
    filterStatus === "all"
      ? orders
      : orders.filter((order) => order.status === filterStatus);

  // Status color
  const getStatusColor = (status) => {
    const colors = {
      pending: "#f39c12",
      confirmed: "#3498db",
      shipped: "#e67e22",
      delivered: "#27ae60",
      cancelled: "#e74c3c",
    };
    return colors[status] || "#666";
  };

  // Status icon
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

  const removeOrder = async (id) => {
  if (!window.confirm("Are you sure you want to remove this order?")) return;

  try {
    await API.delete(`orders/${id}/`);
    setOrders(orders.filter(order => order.id !== id));
  } catch (err) {
    alert("Failed to remove order");
  }
};

  // Stats
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const rejectedOrders = orders.filter(o => o.status === "cancelled").length;

  if (loading)
    return (
      <div className="orders-wrapper">
        <p className="loading-text">Loading orders...</p>
      </div>
    );

  return (
    <div className="orders-wrapper">

      {/* HEADER */}
      <div className="orders-header">
        <div>
          <h1>📦 My Orders</h1>
          <p>Track, manage and monitor your purchases in real-time</p>
        </div>
      </div>

      {location.state?.message && (
        <div className="alert success">
          {location.state.message}
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {/* STATS */}
      <div className="orders-stats">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p>{totalOrders}</p>
        </div>

        <div className="stat-card">
          <h3>Pending</h3>
          <p>{pendingOrders}</p>
        </div>

        <div className="stat-card">
          <h3>Delivered</h3>
          <p>{deliveredOrders}</p>
        </div>

        <div className="stat-card rejected">
          <h3>Rejected</h3>
          <p>{rejectedOrders}</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="orders-filter">
        {["all", "pending", "confirmed", "shipped", "delivered", "cancelled"].map((status) => (
          <button
            key={status}
            className={`filter-btn ${filterStatus === status ? "active" : ""}`}
            onClick={() => setFilterStatus(status)}
          >
            {status === "cancelled" ? "REJECTED" : status.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ORDERS GRID */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📭</div>
          <h3>No Orders Found</h3>
          <p>You have no orders matching this filter.</p>
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`order-card ${
                order.status === "cancelled" ? "rejected-card" : ""
              }`}
              onClick={() =>
                order.status !== "cancelled" &&
                navigate(`/orders/${order.id}`)
              }
            >
              <div className="order-top">
                <h3>Order #{order.id}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {getStatusIcon(order.status)}{" "}
                  {order.status === "cancelled"
                    ? "REJECTED"
                    : order.status.toUpperCase()}
                </span>
              </div>

              <div className="order-body">
                <p><strong>Product:</strong> {order.product?.name || "N/A"}</p>
                <p><strong>Quantity:</strong> {order.quantity}</p>
                <p><strong>Total:</strong> ₹{Number(order.total_price || 0).toFixed(2)}</p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(order.created_at).toLocaleDateString()}
                </p>

                {order.status === "cancelled" && (
                  <p className="rejected-msg">
                    ❌ This order was rejected by the farmer.
                  </p>
                )}
              </div>

              <div className="order-footer">

  {order.status !== "cancelled" && (
    <span
      className="view-text"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/orders/${order.id}`);
      }}
    >
      View Details →
    </span>
  )}

  {(order.status === "cancelled" || order.status === "delivered") && (
    <button
      className="remove-btn"
      onClick={(e) => {
        e.stopPropagation();
        removeOrder(order.id);
      }}
    >
      Remove
    </button>
  )}

</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;