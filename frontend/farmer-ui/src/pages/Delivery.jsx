import { useState } from "react";
import API from "../services/api";
import "../styles/Delivery.css";

function Delivery() {
  const [formData, setFormData] = useState({
    farmer_location: "",
    customer_location: "",
    freshness_score: 0.8,
    temperature_controlled: false,
    product_type: "vegetables",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calculateDeliveryMetrics = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await API.post("orders/delivery/calculate/", {
        ...formData,
        freshness_score: parseFloat(formData.freshness_score),
      });

      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to calculate delivery metrics"
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    if (risk < 20) return "#27ae60";
    if (risk < 40) return "#f39c12";
    return "#e74c3c";
  };

  const productTypes = [
    { value: "vegetables", label: "🥬 Vegetables" },
    { value: "fruits", label: "🍎 Fruits" },
    { value: "dairy", label: "🥛 Dairy" },
    { value: "meats", label: "🥩 Meats" },
    { value: "herbs", label: "🌿 Herbs" },
    { value: "berries", label: "🫐 Berries" },
  ];

 return (
  <div className="delivery-page">
    <div className="delivery-container">

      {/* HEADER */}
      <div className="delivery-header">
        <h1>Delivery & Logistics Intelligence</h1>
        <p>AI-powered spoilage prediction & distance optimization</p>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="delivery-grid">

        {/* FORM CARD */}
        <div className="delivery-card">
          <h2>Delivery Inputs</h2>

          <div className="form-group">
            <label>Farmer Location</label>
            <input
              type="text"
              placeholder="Enter address"
              value={formData.farmer_location}
              onChange={(e) =>
                setFormData({ ...formData, farmer_location: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Customer Location</label>
            <input
              type="text"
              placeholder="Enter address"
              value={formData.customer_location}
              onChange={(e) =>
                setFormData({ ...formData, customer_location: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Product Type</label>
            <select
              value={formData.product_type}
              onChange={(e) =>
                setFormData({ ...formData, product_type: e.target.value })
              }
            >
              {productTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              Freshness Score: {formData.freshness_score.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.freshness_score}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  freshness_score: parseFloat(e.target.value),
                })
              }
            />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              checked={formData.temperature_controlled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  temperature_controlled: e.target.checked,
                })
              }
            />
            <label>Temperature Controlled Vehicle</label>
          </div>

          <button
            className="btn-primary full-width"
            onClick={calculateDeliveryMetrics}
            disabled={
              loading ||
              !formData.farmer_location ||
              !formData.customer_location
            }
          >
            {loading ? "Analyzing..." : "Run AI Analysis"}
          </button>
        </div>

        {/* RESULT CARD */}
        {result && (
          <div className="delivery-card analytics-card">
            <h2>Delivery Insights</h2>

            <div className="metric">
              <span>Distance</span>
              <strong>{result.distance_km?.toFixed(2)} km</strong>
            </div>

            <div className="metric">
              <span>Estimated Time</span>
              <strong>{result.estimated_delivery_hours?.toFixed(1)} hrs</strong>
            </div>

            <div className="metric">
              <span>Spoilage Risk</span>
              <strong
                style={{
                  color: getRiskColor(result.spoilage_risk_percentage),
                }}
              >
                {result.spoilage_risk_percentage?.toFixed(1)}%
              </strong>
            </div>

            <div className="risk-bar">
              <div
                className="risk-fill"
                style={{
                  width: `${result.spoilage_risk_percentage}%`,
                  background: getRiskColor(result.spoilage_risk_percentage),
                }}
              />
            </div>

            <div className="metric">
              <span>Risk Category</span>
              <strong>{result.spoilage_category}</strong>
            </div>

            <div className="metric">
              <span>Delivery Viable</span>
              <strong>
                {result.is_viable ? "Yes" : "No"}
              </strong>
            </div>

            {result.recommendation && (
              <div className="recommendation">
                💡 {result.recommendation}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);
}

export default Delivery;