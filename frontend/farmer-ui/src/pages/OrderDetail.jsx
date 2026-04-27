import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import "../styles/orderdetail.css";

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];

const categoryToProductType = (category = "") => {
  const normalized = String(category).toLowerCase();
  if (normalized.includes("fruit") || normalized.includes("mango") || normalized.includes("banana")) return "fruits";
  if (normalized.includes("milk") || normalized.includes("cheese") || normalized.includes("dairy")) return "dairy";
  if (normalized.includes("meat") || normalized.includes("chicken") || normalized.includes("fish")) return "meats";
  if (normalized.includes("herb") || normalized.includes("leaf")) return "herbs";
  if (normalized.includes("berry")) return "berries";
  return "vegetables";
};

function OrderDetail() {
  const { language } = useLanguage();
  const te = language === "te";
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryMetrics, setDeliveryMetrics] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchOrderDetail();
  }, [id, navigate]);

  const fetchDeliveryMetrics = async (orderData) => {
    if (!orderData?.delivery_address) {
      setDeliveryMetrics(null);
      return;
    }

    try {
      setDeliveryLoading(true);
      const response = await API.post("orders/delivery/calculate/", {
        farmer_location: orderData.farmer_dispatch_location || "Farmer dispatch base not configured",
        farmer_latitude: orderData.farmer_dispatch_latitude,
        farmer_longitude: orderData.farmer_dispatch_longitude,
        customer_location: orderData.delivery_address,
        customer_latitude: orderData.delivery_latitude,
        customer_longitude: orderData.delivery_longitude,
        freshness_score: Number(orderData.product_freshness_score ?? 0.8),
        temperature_controlled: true,
        product_type: categoryToProductType(orderData.product_category),
      });
      setDeliveryMetrics(response.data);
    } catch (err) {
      setDeliveryMetrics(null);
    } finally {
      setDeliveryLoading(false);
    }
  };

  const fetchOrderDetail = async () => {
    try {
      const response = await API.get(`orders/${id}/`);
      const orderData = response.data;
      setOrder(orderData);
      fetchDeliveryMetrics(orderData);
    } catch (err) {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!window.confirm(te ? "ఈ ఆర్డర్‌ను రద్దు చేయాలా?" : "Cancel this order?")) return;
    try {
      setCancelLoading(true);
      const response = await API.patch(`orders/${id}/`, { status: "cancelled" });
      setOrder(response.data);
      navigate("/orders");
    } catch (err) {
      alert(err.response?.data?.detail || (te ? "ఆర్డర్ రద్దు చేయలేకపోయాము." : "Failed to cancel order."));
    } finally {
      setCancelLoading(false);
    }
  };

  const activeIndex = STATUS_STEPS.indexOf(order?.status);
  const riskTone = useMemo(() => {
    const risk = Number(deliveryMetrics?.spoilage_risk_percentage || 0);
    if (risk < 20) return "low";
    if (risk < 40) return "medium";
    return "high";
  }, [deliveryMetrics]);
  const canCancel = ["pending", "confirmed"].includes(order?.status);

  if (loading) return <div className="loading">{te ? "లోడ్ అవుతోంది..." : "Loading..."}</div>;
  if (!order) return null;

  return (
    <div className="order-page">
      <div className="order-header">
        <div className="left-section">
          <button className="back-btn" onClick={() => navigate("/orders")}>{te ? "వెనక్కి" : "Back"}</button>
          <div className="order-title">
            <h2>{te ? `ఆర్డర్ #${order.id}` : `Order #${order.id}`}</h2>
            <span className={`status ${order.status}`}>{order.status}</span>
          </div>
        </div>
      </div>

      <div className="progress-container">
        {STATUS_STEPS.map((step, index) => (
          <div key={step} className="step-wrapper">
            <div className={`step-circle ${index <= activeIndex ? "active" : ""}`}>{index + 1}</div>
            <span className="step-label">{step}</span>
            {index !== STATUS_STEPS.length - 1 && <div className={`step-line ${index < activeIndex ? "active-line" : ""}`} />}
          </div>
        ))}
      </div>

      <div className="order-grid">
        <div className="left-column">
          <div className="card">
            <h3>{te ? "ఉత్పత్తి వివరాలు" : "Product Details"}</h3>
            <div className="product-box">
              <img src={order.product_image || "https://via.placeholder.com/120"} alt="product" className="product-image" />
              <div className="product-info">
                <h4>{order.product_name}</h4>
                <p><strong>{te ? "పరిమాణం" : "Quantity"}:</strong> {order.quantity}</p>
                <p><strong>{te ? "ధర" : "Price"}:</strong> Rs.{order.product_price} / {te ? "యూనిట్" : "unit"}</p>
                <p><strong>{te ? "మొత్తం" : "Total"}:</strong> Rs.{order.total_price}</p>
              </div>
            </div>
          </div>

          {order.delivery_address && (
            <div className="card">
              <h3>{te ? "డెలివరీ చిరునామా" : "Delivery Address"}</h3>
              <p>{order.delivery_address}</p>
            </div>
          )}

          <div className={`card metrics-card ${riskTone}`}>
            <div className="metrics-header">
              <div>
                <h3>{te ? "డెలివరీ మెట్రిక్స్" : "Delivery Metrics"}</h3>
                <p>{te ? "సేవ్ చేసిన డిస్పాచ్ స్థానం, కస్టమర్ స్థానం, తాజాదనంపై ఆధారిత ప్రత్యక్ష అంచనా." : "Live estimate based on saved dispatch base, customer location, and product freshness."}</p>
              </div>
              {deliveryLoading ? <span className="metrics-badge">{te ? "రీఫ్రెష్ అవుతోంది..." : "Refreshing..."}</span> : <span className="metrics-badge">{te ? "రూట్ స్నాప్‌షాట్" : "Route snapshot"}</span>}
            </div>

            {!deliveryMetrics ? (
              <div className="metrics-empty">
                <p>{te ? "ప్రస్తుతం డెలివరీ మెట్రిక్స్ లేవు. రైతు డిస్పాచ్ బేస్ లేదా మ్యాప్‌లోంచి కస్టమర్ చిరునామా జోడించండి." : "Delivery metrics are unavailable right now. Add a farmer dispatch base or a map-picked customer address for better route estimation."}</p>
              </div>
            ) : (
              <>
                <div className="metrics-top-grid">
                  <div className="metric-highlight">
                    <span>{te ? "దూరం" : "Distance"}</span>
                    <strong>{deliveryMetrics.distance_km?.toFixed(2)} km</strong>
                  </div>
                  <div className="metric-highlight">
                    <span>{te ? "అంచనా సమయం" : "Estimated Time"}</span>
                    <strong>{deliveryMetrics.estimated_delivery_hours?.toFixed(1)} hrs</strong>
                  </div>
                  <div className="metric-highlight">
                    <span>{te ? "పాడైపోయే ప్రమాదం" : "Spoilage Risk"}</span>
                    <strong>{deliveryMetrics.spoilage_risk_percentage?.toFixed(1)}%</strong>
                  </div>
                </div>

                <div className="risk-track">
                  <div className={`risk-fill ${riskTone}`} style={{ width: `${Math.min(100, deliveryMetrics.spoilage_risk_percentage || 0)}%` }} />
                </div>

                <div className="metric-stack">
                  <div className="metric-row"><span>{te ? "ప్రమాద వర్గం" : "Risk Category"}</span><span>{deliveryMetrics.spoilage_category}</span></div>
                  <div className="metric-row"><span>{te ? "డెలివరీ సాధ్యమా" : "Delivery Viable"}</span><span>{deliveryMetrics.is_viable ? (te ? "అవును" : "Yes") : (te ? "కాదు" : "No")}</span></div>
                  <div className="metric-row"><span>{te ? "రైతు డిస్పాచ్ బేస్" : "Farmer Dispatch Base"}</span><span>{deliveryMetrics.addresses?.farmer_normalized || order.farmer_dispatch_location || (te ? "సెట్ చేయలేదు" : "Not configured")}</span></div>
                  <div className="metric-row"><span>{te ? "కస్టమర్ స్థానం" : "Customer Location"}</span><span>{deliveryMetrics.addresses?.customer_normalized || order.delivery_address}</span></div>
                </div>

                {deliveryMetrics.recommendation ? <div className="delivery-recommendation">{deliveryMetrics.recommendation}</div> : null}
              </>
            )}
          </div>
        </div>

        <div className="right-column">
          <div className="card">
            <h3>{te ? "ధర వివరాలు" : "Price Breakdown"}</h3>
            <div className="price-row"><span>{te ? "ఉపమొత్తం" : "Subtotal"}</span><span>Rs.{order.subtotal}</span></div>
            <div className="price-row"><span>{te ? "షిప్పింగ్" : "Shipping"}</span><span>Rs.{order.shipping_cost}</span></div>
            <div className="price-row"><span>{te ? "పన్ను" : "Tax"}</span><span>Rs.{order.tax}</span></div>
            <div className="price-row total"><span>{te ? "మొత్తం" : "Total"}</span><span>Rs.{order.total_price}</span></div>
          </div>

          <div className="card">
            <h3>{te ? "ఆర్డర్ సమాచారం" : "Order Info"}</h3>
            <p>{te ? "సృష్టించబడింది" : "Created"}: {new Date(order.created_at).toLocaleString()}</p>
            <p>{te ? "నవీకరించబడింది" : "Updated"}: {new Date(order.updated_at).toLocaleString()}</p>
            <p>{te ? "రైతు" : "Farmer"}: {order.farmer_username}</p>
          </div>

          <div className="card action-card">
            <h3>{te ? "ఆర్డర్ చర్యలు" : "Order Actions"}</h3>
            <p>{canCancel ? (te ? "డిస్పాచ్ ముందుకు వెళ్లే ముందు ఈ ఆర్డర్‌ను రద్దు చేయవచ్చు." : "You can cancel this order before dispatch progresses further.") : (te ? "ఈ ఆర్డర్‌ను ఇకపై ఈ పేజీ నుండి రద్దు చేయలేరు." : "This order can no longer be cancelled from the detail page.")}</p>
            <button className="cancel-btn" onClick={cancelOrder} disabled={!canCancel || cancelLoading}>
              {cancelLoading ? (te ? "రద్దు అవుతోంది..." : "Cancelling...") : (te ? "ఆర్డర్ రద్దు" : "Cancel Order")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;
