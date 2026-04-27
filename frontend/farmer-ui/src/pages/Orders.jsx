import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import "../styles/Orders.css";

function Orders() {
  const { language } = useLanguage();
  const te = language === "te";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
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
        setError(te ? "ఆర్డర్లు లోడ్ చేయలేకపోయాము" : "Failed to load orders");
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
      pending: "#f39c12",
      confirmed: "#3498db",
      shipped: "#e67e22",
      delivered: "#27ae60",
      cancelled: "#e74c3c",
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

  const removeOrder = async (id) => {
    if (!window.confirm(te ? "ఈ ఆర్డర్‌ను తొలగించాలా?" : "Are you sure you want to remove this order?")) return;

    try {
      await API.delete(`orders/${id}/`);
      setOrders(orders.filter((order) => order.id !== id));
    } catch {
      alert(te ? "ఆర్డర్ తొలగింపు విఫలమైంది" : "Failed to remove order");
    }
  };

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const rejectedOrders = orders.filter((o) => o.status === "cancelled").length;

  if (loading) {
    return (
      <div className="orders-wrapper">
        <p className="loading-text">{te ? "ఆర్డర్లు లోడ్ అవుతున్నాయి..." : "Loading orders..."}</p>
      </div>
    );
  }

  return (
    <div className="orders-wrapper">
      <div className="orders-header">
        <div>
          <h1>{te ? "📦 నా ఆర్డర్లు" : "📦 My Orders"}</h1>
          <p>{te ? "మీ కొనుగోళ్లను రియల్-టైమ్‌లో ట్రాక్ చేయండి మరియు నిర్వహించండి" : "Track, manage and monitor your purchases in real-time"}</p>
        </div>
      </div>

      {location.state?.message && <div className="alert success">{location.state.message}</div>}
      {error && <div className="error-box">{error}</div>}

      <div className="orders-stats">
        <div className="stat-card">
          <h3>{te ? "మొత్తం ఆర్డర్లు" : "Total Orders"}</h3>
          <p>{totalOrders}</p>
        </div>
        <div className="stat-card">
          <h3>{te ? "పెండింగ్" : "Pending"}</h3>
          <p>{pendingOrders}</p>
        </div>
        <div className="stat-card">
          <h3>{te ? "డెలివర్ అయినవి" : "Delivered"}</h3>
          <p>{deliveredOrders}</p>
        </div>
        <div className="stat-card rejected">
          <h3>{te ? "తిరస్కరించబడ్డవి" : "Rejected"}</h3>
          <p>{rejectedOrders}</p>
        </div>
      </div>

      <div className="orders-filter">
        {["all", "pending", "confirmed", "shipped", "delivered", "cancelled"].map((status) => (
          <button
            key={status}
            className={`filter-btn ${filterStatus === status ? "active" : ""}`}
            onClick={() => setFilterStatus(status)}
          >
            {status === "cancelled"
              ? (te ? "తిరస్కరించబడింది" : "REJECTED")
              : status.toUpperCase()}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📭</div>
          <h3>{te ? "ఆర్డర్లు లేవు" : "No Orders Found"}</h3>
          <p>{te ? "ఈ ఫిల్టర్‌కు సరిపోయే ఆర్డర్లు లేవు." : "You have no orders matching this filter."}</p>
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`order-card ${order.status === "cancelled" ? "rejected-card" : ""}`}
              onClick={() => order.status !== "cancelled" && navigate(`/orders/${order.id}`)}
            >
              <div className="order-top">
                <h3>{te ? `ఆర్డర్ #${order.id}` : `Order #${order.id}`}</h3>
                <span className="status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                  {getStatusIcon(order.status)}{" "}
                  {order.status === "cancelled"
                    ? (te ? "తిరస్కరించబడింది" : "REJECTED")
                    : order.status.toUpperCase()}
                </span>
              </div>

              <div className="order-body">
                <p><strong>{te ? "ఉత్పత్తి" : "Product"}:</strong> {order.product?.name || "N/A"}</p>
                <p><strong>{te ? "పరిమాణం" : "Quantity"}:</strong> {order.quantity}</p>
                <p><strong>{te ? "మొత్తం" : "Total"}:</strong> ₹{Number(order.total_price || 0).toFixed(2)}</p>
                <p><strong>{te ? "తేదీ" : "Date"}:</strong> {new Date(order.created_at).toLocaleDateString()}</p>

                {order.status === "confirmed" && (
                  <p className="status-message confirmed-msg">
                    {te ? "✅ రైతు మీ ఆర్డర్‌ను ధృవీకరించారు." : "✅ Farmer has confirmed your order."}
                  </p>
                )}
                {order.status === "shipped" && (
                  <p className="status-message shipped-msg">
                    {te ? "🚚 మీ ఆర్డర్ మార్గంలో ఉంది." : "🚚 Your order is on the way."}
                  </p>
                )}
                {order.status === "delivered" && (
                  <p className="status-message delivered-msg">
                    {te ? "📦 ఆర్డర్ విజయవంతంగా డెలివర్ అయింది." : "📦 Order successfully delivered."}
                  </p>
                )}
                {order.status === "cancelled" && (
                  <p className="rejected-msg">
                    {te ? "❌ ఈ ఆర్డర్‌ను రైతు తిరస్కరించారు." : "❌ This order was rejected by the farmer."}
                  </p>
                )}
              </div>

              <div className="order-progress">
                <div className={`step ${["pending", "confirmed", "shipped", "delivered"].includes(order.status) ? "active" : ""}`}>
                  {te ? "ఆర్డర్ పెట్టబడింది" : "Order Placed"}
                </div>
                <div className={`step ${["confirmed", "shipped", "delivered"].includes(order.status) ? "active" : ""}`}>
                  {te ? "ధృవీకరించబడింది" : "Confirmed"}
                </div>
                <div className={`step ${["shipped", "delivered"].includes(order.status) ? "active" : ""}`}>
                  {te ? "షిప్ అయ్యింది" : "Shipped"}
                </div>
                <div className={`step ${order.status === "delivered" ? "active" : ""}`}>
                  {te ? "డెలివర్ అయ్యింది" : "Delivered"}
                </div>
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
                    {te ? "వివరాలు చూడండి →" : "View Details →"}
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
                    {te ? "తొలగించు" : "Remove"}
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

