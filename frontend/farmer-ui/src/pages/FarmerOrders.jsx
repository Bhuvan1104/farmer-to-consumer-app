import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

import API from "../services/api";
import "../styles/FarmerOrders.css";

function FarmerOrders() {
  const { language } = useLanguage();
  const te = language === "te";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await API.get("orders/");
      setOrders(response.data);
    } catch (error) {
      console.error("Failed to fetch farmer orders", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setActionLoadingId(id);
      await API.patch(`orders/${id}/`, { status });
      fetchOrders();
    } catch (error) {
      console.error("Failed to update order status", error);
      alert(error.response?.data?.detail || (te ? "ఆర్డర్ స్థితి నవీకరణ విఫలమైంది" : "Failed to update order status"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatCurrency = (value) => Number(value || 0).toFixed(2);

  const getStatusClass = (status) => {
    switch (status) {
      case "confirmed":
        return "status confirmed";
      case "packed":
        return "status packed";
      case "shipped":
        return "status shipped";
      case "out_for_delivery":
        return "status out";
      case "delivered":
        return "status delivered";
      case "cancelled":
        return "status cancelled";
      default:
        return "status pending";
    }
  };

  const renderActions = (order) => {
    const disabled = actionLoadingId === order.id;

    if (order.status === "pending") {
      return (
        <div className="order-actions">
          <button className="btn accept" onClick={() => updateStatus(order.id, "confirmed")} disabled={disabled}>
            {disabled ? (te ? "అప్డేట్ అవుతోంది..." : "Updating...") : (te ? "ఆర్డర్ అంగీకరించు" : "Accept Order")}
          </button>
          <button className="btn reject" onClick={() => updateStatus(order.id, "cancelled")} disabled={disabled}>
            {disabled ? (te ? "అప్డేట్ అవుతోంది..." : "Updating...") : (te ? "ఆర్డర్ తిరస్కరించు" : "Reject Order")}
          </button>
        </div>
      );
    }

    if (order.status === "confirmed") {
      return <button className="btn next" onClick={() => updateStatus(order.id, "packed")} disabled={disabled}>{disabled ? (te ? "అప్డేట్ అవుతోంది..." : "Updating...") : (te ? "ప్యాక్ చేసినట్టు గుర్తించు" : "Mark as Packed")}</button>;
    }

    if (order.status === "packed") {
      return <button className="btn next" onClick={() => updateStatus(order.id, "shipped")} disabled={disabled}>{disabled ? (te ? "అప్డేట్ అవుతోంది..." : "Updating...") : (te ? "షిప్ చేసినట్టు గుర్తించు" : "Mark as Shipped")}</button>;
    }

    if (order.status === "shipped") {
      return <button className="btn next" onClick={() => updateStatus(order.id, "out_for_delivery")} disabled={disabled}>{disabled ? (te ? "అప్డేట్ అవుతోంది..." : "Updating...") : (te ? "డెలివరీకి బయలుదేరింది" : "Out for Delivery")}</button>;
    }

    if (order.status === "out_for_delivery") {
      return <button className="btn complete" onClick={() => updateStatus(order.id, "delivered")} disabled={disabled}>{disabled ? (te ? "అప్డేట్ అవుతోంది..." : "Updating...") : (te ? "డెలివర్ అయినట్టు గుర్తించు" : "Mark Delivered")}</button>;
    }

    return null;
  };

  if (loading) return <div className="loading">{te ? "ఆర్డర్లు లోడ్ అవుతున్నాయి..." : "Loading orders..."}</div>;

  return (
    <div className="farmer-orders-page">
      <div className="orders-header">
        <h1>{te ? "వస్తున్న ఆర్డర్లు" : "Incoming Orders"}</h1>
        <p>{te ? "కస్టమర్ ఆర్డర్లు మరియు డెలివరీ అనుమతులను నిర్వహించండి" : "Manage customer orders and delivery approvals"}</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <h3>{te ? "ఇంకా ఆర్డర్లు లేవు" : "No Orders Yet"}</h3>
          <p>{te ? "కొత్త కస్టమర్ ఆర్డర్లు ఇక్కడ కనిపిస్తాయి." : "New customer orders will appear here."}</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-top">
                <h3>{order.product_name}</h3>
                <span className={getStatusClass(order.status)}>
                  {order.status === "confirmed"
                    ? (te ? "రైతు ధృవీకరించారు" : "Confirmed by Farmer")
                    : order.status.replaceAll("_", " ")}
                </span>
              </div>

              <div className="order-details">
                <p><strong>{te ? "కస్టమర్" : "Customer"}:</strong> {order.consumer_username}</p>
                <p><strong>{te ? "పరిమాణం" : "Quantity"}:</strong> {order.quantity}</p>
                <p className="price">Rs.{formatCurrency(order.total_price)}</p>
              </div>

              <div className="order-progress">
                <div className={`step ${order.status !== "pending" ? "active" : ""}`}>{te ? "ధృవీకరణ" : "Confirmed"}</div>
                <div className={`step ${["packed", "shipped", "out_for_delivery", "delivered"].includes(order.status) ? "active" : ""}`}>{te ? "ప్యాక్" : "Packed"}</div>
                <div className={`step ${["shipped", "out_for_delivery", "delivered"].includes(order.status) ? "active" : ""}`}>{te ? "షిప్" : "Shipped"}</div>
                <div className={`step ${["out_for_delivery", "delivered"].includes(order.status) ? "active" : ""}`}>{te ? "డెలివరీ" : "Delivery"}</div>
                <div className={`step ${order.status === "delivered" ? "active" : ""}`}>{te ? "డెలివర్" : "Delivered"}</div>
              </div>

              <div className="action-shell">
                {renderActions(order)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FarmerOrders;
