import { useState } from "react";
import API from "../services/api";
import "../styles/Pages.css";

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
        farmer_location: formData.farmer_location,
        customer_location: formData.customer_location,
        freshness_score: parseFloat(formData.freshness_score),
        temperature_controlled: formData.temperature_controlled,
        product_type: formData.product_type,
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to calculate delivery metrics");
    } finally {
      setLoading(false);
    }
  };

  const productTypes = [
    { value: "vegetables", label: "🥬 Vegetables" },
    { value: "fruits", label: "🍎 Fruits" },
    { value: "dairy", label: "🥛 Dairy" },
    { value: "meats", label: "🥩 Meats" },
    { value: "herbs", label: "🌿 Herbs" },
    { value: "berries", label: "🫐 Berries" },
  ];

  const getSpoilageColor = (risk) => {
    if (risk < 20) return "green";
    if (risk < 40) return "yellow";
    return "red";
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🚚 Delivery & Logistics</h1>
        <p>Calculate delivery time and spoilage risk</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-section">
        <h2>📍 Delivery Information</h2>

        <div className="form-group">
          <label>Farmer Location:</label>
          <input
            type="text"
            placeholder="Enter farmer address or coordinates (lat, lng)"
            value={formData.farmer_location}
            onChange={(e) =>
              setFormData({ ...formData, farmer_location: e.target.value })
            }
          />
          <small>Example: "123 Farm Road, NY" or "40.7128, -74.0060"</small>
        </div>

        <div className="form-group">
          <label>Customer Location:</label>
          <input
            type="text"
            placeholder="Enter customer address or coordinates (lat, lng)"
            value={formData.customer_location}
            onChange={(e) =>
              setFormData({ ...formData, customer_location: e.target.value })
            }
          />
          <small>Example: "456 Market St, NY" or "40.7489, -73.9680"</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Product Type:</label>
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
            <label>Freshness Score (0-1):</label>
            <div className="slider-container">
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
              <span>{formData.freshness_score.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="form-group checkbox">
          <label>
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
            🌡️ Temperature Controlled Vehicle
          </label>
        </div>

        <button
          className="primary-button"
          onClick={calculateDeliveryMetrics}
          disabled={
            loading || !formData.farmer_location || !formData.customer_location
          }
        >
          {loading ? "Calculating..." : "Calculate Delivery Metrics"}
        </button>
      </div>

      {result && (
        <div className={`result-card success`}>
          <h3>✅ Delivery Metrics</h3>

          <div className="result-grid">
            <div className="result-item">
              <span className="label">📏 Distance:</span>
              <span className="value">{result.distance_km?.toFixed(2)} km</span>
            </div>

            <div className="result-item">
              <span className="label">⏱️ Estimated Delivery Time:</span>
              <span className="value">{result.estimated_delivery_hours?.toFixed(1)} hours</span>
            </div>

            <div className="result-item">
              <span className="label">⚠️ Spoilage Risk:</span>
              <span
                className="value"
                style={{
                  color: getSpoilageColor(result.spoilage_risk_percentage),
                }}
              >
                {result.spoilage_risk_percentage?.toFixed(1)}%
              </span>
            </div>

            <div className="result-item">
              <span className="label">📊 Risk Category:</span>
              <span className="value badge">{result.spoilage_category}</span>
            </div>

            <div className="result-item">
              <span className="label">✅ Viable for Delivery:</span>
              <span className="value">
                {result.is_viable ? "✅ Yes" : "❌ No"}
              </span>
            </div>
          </div>

          {result.coordinates && (
            <div className="coordinates-info">
              <strong>📍 Coordinates:</strong>
              <p>
                Farmer: {result.coordinates.farmer_coords?.join(", ")}
              </p>
              <p>
                Customer: {result.coordinates.customer_coords?.join(", ")}
              </p>
            </div>
          )}

          {result.recommendation && (
            <div className="recommendation">
              <strong>💡 Recommendation:</strong> {result.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Delivery;
