import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/Pages.css";

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await API.get(`orders/${id}/`);
      setOrder(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
      } else if (err.response?.status === 404) {
        setError("Order not found");
      } else {
        setError("Failed to load order details");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusTimeline = () => {
    const statuses = [
      { status: "pending", label: "Pending", icon: "📋" },
      { status: "confirmed", label: "Confirmed", icon: "✅" },
      { status: "shipped", label: "Shipped", icon: "🚚" },
      { status: "delivered", label: "Delivered", icon: "📦" },
    ];

    return statuses;
  };

  const isStatusCompleted = (checkStatus, currentStatus) => {
    const order_flow = ["pending", "confirmed", "shipped", "delivered"];
    return (
      order_flow.indexOf(checkStatus) <= order_flow.indexOf(currentStatus)
    );
  };

  if (loading) return <div className="page-container"><p>Loading order...</p></div>;
  if (error) return <div className="page-container"><div className="error-message">{error}</div></div>;

  if (!order) return <div className="page-container"><p>Order not found</p></div>;

  const timeline = getStatusTimeline();

  return (
    <div className="page-container">
      <button className="back-button" onClick={() => navigate("/orders")}>
        ← Back to Orders
      </button>

      <div className="page-header">
        <h1>📦 Order #{order.id}</h1>
        <p>Track your order status and details</p>
      </div>

      <div className="order-detail-container">
        {/* Status Timeline */}
        <div className="timeline-section">
          <h3>📍 Order Timeline</h3>
          <div className="timeline">
            {timeline.map((item, index) => (
              <div key={item.status} className="timeline-item">
                <div
                  className={`timeline-dot ${
                    isStatusCompleted(item.status, order.status)
                      ? "completed"
                      : ""
                  } ${item.status === order.status ? "current" : ""}`}
                >
                  {item.icon}
                </div>
                <div className="timeline-label">
                  <h4>{item.label}</h4>
                  {item.status === order.status && (
                    <p className="current-status">Current Status</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Information */}
        <div className="info-section">
          <h3>📋 Order Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Order ID:</span>
              <span className="value">#{order.id}</span>
            </div>

            <div className="info-item">
              <span className="label">Status:</span>
              <span className="value badge">{order.status?.toUpperCase()}</span>
            </div>

            <div className="info-item">
              <span className="label">Order Date:</span>
              <span className="value">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="info-item">
              <span className="label">Updated:</span>
              <span className="value">
                {new Date(order.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Product Details */}
        <div className="info-section">
          <h3>🛍️ Product Details</h3>
          {order.product && (
            <div className="product-info">
              <div className="product-header">
                <h4>{order.product.name}</h4>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Category:</span>
                  <span className="value">{order.product.category}</span>
                </div>

                <div className="info-item">
                  <span className="label">Price per Unit:</span>
                  <span className="value">${order.product.price?.toFixed(2)}</span>
                </div>

                <div className="info-item">
                  <span className="label">Quantity:</span>
                  <span className="value">{order.quantity}</span>
                </div>

                <div className="info-item">
                  <span className="label">Freshness:</span>
                  <span className="value">
                    {(order.product.freshness_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {order.product.description && (
                <p className="description">{order.product.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Pricing Summary */}
        <div className="info-section">
          <h3>💰 Pricing Summary</h3>
          <div className="pricing-summary">
            <div className="price-row">
              <span className="label">Subtotal:</span>
              <span className="value">${order.subtotal?.toFixed(2)}</span>
            </div>

            <div className="price-row">
              <span className="label">Shipping:</span>
              <span className="value">${order.shipping_cost?.toFixed(2) || "0.00"}</span>
            </div>

            <div className="price-row">
              <span className="label">Tax:</span>
              <span className="value">${order.tax?.toFixed(2) || "0.00"}</span>
            </div>

            <div className="price-row total">
              <span className="label">Total:</span>
              <span className="value">${order.total_price?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        {order.delivery_address && (
          <div className="info-section">
            <h3>🚚 Delivery Information</h3>
            <div className="delivery-info">
              <p>{order.delivery_address}</p>
              {order.estimated_delivery && (
                <p className="delivery-date">
                  📅 Estimated Delivery:{" "}
                  {new Date(order.estimated_delivery).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="actions-section">
          {order.status === "pending" && (
            <button className="danger-button">Cancel Order</button>
          )}
          {order.status === "delivered" && (
            <button className="primary-button">Leave Review</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;
