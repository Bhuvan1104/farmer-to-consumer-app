import { useEffect, useState } from "react";
import API from "../services/api";
import "../styles/FarmerOrders.css";

function FarmerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
      await API.patch(`orders/${id}/`, { status });
      fetchOrders();
    } catch (error) {
      console.error("Failed to update order status", error);
    }
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toFixed(2);
  };

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

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div className="farmer-orders-page">
      <div className="orders-header">
        <h1>📦 Incoming Orders</h1>
        <p>Manage customer orders and delivery approvals</p>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <h3>No Orders Yet</h3>
          <p>New customer orders will appear here.</p>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-top">
                <h3>{order.product_name}</h3>
                <span className={getStatusClass(order.status)}>
                  {order.status}
                </span>
              </div>

              <div className="order-details">
                <p>
                  <strong>Customer:</strong> {order.consumer_username}
                </p>
                <p>
                  <strong>Quantity:</strong> {order.quantity}
                </p>
                <p className="price">
                  ₹{formatCurrency(order.total_price)}
                </p>
              </div>

              <div className="order-progress">

                    <div className={`step ${order.status !== "pending" ? "active" : ""}`}>
                      Confirmed
                    </div>

                    <div className={`step ${["packed","shipped","out_for_delivery","delivered"].includes(order.status) ? "active" : ""}`}>
                      Packed
                    </div>

                    <div className={`step ${["shipped","out_for_delivery","delivered"].includes(order.status) ? "active" : ""}`}>
                      Shipped
                    </div>

                    <div className={`step ${["out_for_delivery","delivered"].includes(order.status) ? "active" : ""}`}>
                      Delivery
                    </div>

                    <div className={`step ${order.status === "delivered" ? "active" : ""}`}>
                      Delivered
                    </div>

                  </div>

              {order.status === "pending" && (
                <div className="order-actions">

                        {order.status === "pending" && (
                              <div className="order-actions">

                                <button
                                  className="btn accept"
                                  onClick={() => updateStatus(order.id, "confirmed")}
                                >
                                  ✔ Accept Order
                                </button>

                                <button
                                  className="btn reject"
                                  onClick={() => updateStatus(order.id, "cancelled")}
                                >
                                  ✖ Reject Order
                                </button>

                              </div>
                            )}

                        {order.status === "confirmed" && (
                          <button
                            className="btn next"
                            onClick={() => updateStatus(order.id, "packed")}
                          >
                            Mark as Packed
                          </button>
                        )}

                        {order.status === "packed" && (
                          <button
                            className="btn next"
                            onClick={() => updateStatus(order.id, "shipped")}
                          >
                            Mark as Shipped
                          </button>
                        )}

                        {order.status === "shipped" && (
                          <button
                            className="btn next"
                            onClick={() => updateStatus(order.id, "out_for_delivery")}
                          >
                            Out for Delivery
                          </button>
                        )}

                        {order.status === "out_for_delivery" && (
                          <button
                            className="btn complete"
                            onClick={() => updateStatus(order.id, "delivered")}
                          >
                            Mark Delivered
                          </button>
                        )}

                      </div>
              )}
              <div className="order-top">
                <h3>{order.product_name}</h3>

                <span className={getStatusClass(order.status)}>
                  {order.status === "confirmed" ? "Confirmed by Farmer" : order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FarmerOrders;