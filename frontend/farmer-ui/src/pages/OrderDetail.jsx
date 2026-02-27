import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/orderdetail.css";

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryMetrics, setDeliveryMetrics] = useState(null);

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchDeliveryMetrics = async () => {
    try {
      const response = await API.post("orders/calculate-delivery-metrics/", {
        farmer_location: "17.3850,78.4867",
        customer_location: "17.4500,78.3800",
        freshness_score: 0.8,
        temperature_controlled: true,
        product_type: "vegetables",
      });

      setDeliveryMetrics(response.data);
    } catch (err) {
      console.error("Delivery metrics error:", err);
    }
  };

  const fetchOrderDetail = async () => {
    try {
      const response = await API.get(`orders/${id}/`);
      setOrder(response.data);
      fetchDeliveryMetrics();
    } catch (err) {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    try {
      await API.patch(`orders/${id}/`, { status: "cancelled" });
      navigate("/orders");
    } catch (err) {
      alert("Failed to cancel order.");
    }
  };

  const steps = ["pending", "confirmed", "shipped", "delivered"];

  if (loading) return <div className="loading">Loading...</div>;
  if (!order) return null;

  return (
    <div className="order-page">

      {/* HEADER */}
      <div className="order-header">
        <div className="left-section">
          <button className="back-btn" onClick={() => navigate("/orders")}>
            ← Back
          </button>

          <div className="order-title">
            <h2>Order #{order.id}</h2>
            <span className={`status ${order.status}`}>
              {order.status}
            </span>
          </div>
        </div>
      </div>

      {/* PROGRESS STEPPER */}
      <div className="progress-container">
        {steps.map((step, index) => {
          const activeIndex = steps.indexOf(order.status);
          return (
            <div key={step} className="step-wrapper">
              <div
                className={`step-circle ${
                  index <= activeIndex ? "active" : ""
                }`}
              >
                {index + 1}
              </div>
              <span className="step-label">{step}</span>
              {index !== steps.length - 1 && (
                <div
                  className={`step-line ${
                    index < activeIndex ? "active-line" : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* MAIN GRID */}
      <div className="order-grid">

        {/* LEFT */}
        <div className="left-column">

          <div className="card">
            <h3>Product Details</h3>
            <div className="product-box">
              {order.product?.image && (
                <img src={order.product.image} alt="product" />
              )}
              <div>
                <h4>{order.product?.name}</h4>
                <p>Category: {order.product?.category}</p>
                <p>Quantity: {order.quantity}</p>
                <p>₹{order.product?.price} / unit</p>
              </div>
            </div>
          </div>

          {order.delivery_address && (
            <div className="card">
              <h3>Delivery Address</h3>
              <p>{order.delivery_address}</p>
            </div>
          )}

          {deliveryMetrics && (
            <div className="card">
              <h3>Delivery Metrics</h3>
              <p>Distance: {deliveryMetrics.distance_km} km</p>
              <p>Estimated Time: {deliveryMetrics.estimated_delivery_hours} hrs</p>
              <p>Spoilage Risk: {deliveryMetrics.spoilage_risk_percentage}%</p>
              <p>
                Viable:{" "}
                {deliveryMetrics.is_viable ? "✅ Yes" : "❌ No"}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="right-column">

          <div className="card">
            <h3>Price Breakdown</h3>
            <div className="price-row">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="price-row">
              <span>Shipping</span>
              <span>₹{order.shipping_cost}</span>
            </div>
            <div className="price-row">
              <span>Tax</span>
              <span>₹{order.tax}</span>
            </div>
            <div className="price-row total">
              <span>Total</span>
              <span>₹{order.total_price}</span>
            </div>
          </div>

          <div className="card">
            <h3>Order Info</h3>
            <p>Created: {new Date(order.created_at).toLocaleString()}</p>
            <p>Updated: {new Date(order.updated_at).toLocaleString()}</p>
          </div>

          {order.status === "pending" && (
            <button className="cancel-btn" onClick={cancelOrder}>
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;