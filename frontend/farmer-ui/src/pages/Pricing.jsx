import { useState, useEffect } from "react";
import API from "../services/api";
import "../styles/Pages.css";

function Pricing() {
  const [activeTab, setActiveTab] = useState("dynamic");
  const [formData, setFormData] = useState({
    base_price: "",
    freshness_score: 0.8,
    demand_index: 5,
    seasonal_factor: 1.0,
  });
  const [mlFormData, setMlFormData] = useState({
    base_price: "",
    freshness_score: 0.8,
    demand_index: 5,
    seasonal_factor: 1.0,
  });
  const [result, setResult] = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calculateDynamicPrice = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await API.post("pricing/dynamic-price/", {
        base_price: parseFloat(formData.base_price),
        freshness_score: parseFloat(formData.freshness_score),
      });

      // map backend response to UI-friendly shape
      setResult({
        calculated_price: response.data.suggested_price,
        base_price: response.data.base_price,
        freshness_impact: response.data.discount_percentage,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to calculate price");
    } finally {
      setLoading(false);
    }
  };

  const predictMLPrice = async () => {
    setLoading(true);
    setError("");
    setMlResult(null);

    try {
      const response = await API.post("pricing/predict-price-ml/", {
        base_price: parseFloat(mlFormData.base_price),
        freshness_score: parseFloat(mlFormData.freshness_score),
        demand_index: parseFloat(mlFormData.demand_index),
        seasonal_factor: parseFloat(mlFormData.seasonal_factor),
      });

      setMlResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to predict price");
    } finally {
      setLoading(false);
    }
  };

  const predictShelfLife = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await API.post("pricing/predict-shelf-life/");
      setResult({
        shelf_life_days: response.data.estimated_days_remaining || response.data.estimated_remaining_days,
        freshness_score: response.data.freshness_score,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to predict shelf life");
    } finally {
      setLoading(false);
    }
  };

  const [freshnessFile, setFreshnessFile] = useState(null);
  const [freshnessResult, setFreshnessResult] = useState(null);

  const uploadFreshnessImage = async () => {
    if (!freshnessFile) return setError("Please choose an image first");
    setLoading(true);
    setError("");
    setFreshnessResult(null);

    try {
      const formData = new FormData();
      formData.append("image", freshnessFile);

      const response = await API.post("pricing/predict-freshness/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFreshnessResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to analyze image");
    } finally {
      setLoading(false);
    }
  };

  const calculateAdvancedPrice = async (includeRange = false) => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await API.post("pricing/advanced-dynamic-price/", {
        base_price: parseFloat(formData.base_price),
        freshness_score: parseFloat(formData.freshness_score),
        demand_index: parseFloat(formData.demand_index),
        season: formData.season || "normal",
        include_range: includeRange,
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to calculate advanced price");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💰 Pricing Calculator</h1>
        <p>Calculate and predict product prices dynamically</p>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === "dynamic" ? "active" : ""}`}
          onClick={() => setActiveTab("dynamic")}
        >
          📊 Dynamic Pricing
        </button>
        <button
          className={`tab-button ${activeTab === "advanced" ? "active" : ""}`}
          onClick={() => setActiveTab("advanced")}
        >
          ⚙️ Advanced Pricing
        </button>
        <button
          className={`tab-button ${activeTab === "ml" ? "active" : ""}`}
          onClick={() => setActiveTab("ml")}
        >
          🤖 ML Price Prediction
        </button>
        <button
          className={`tab-button ${activeTab === "freshness" ? "active" : ""}`}
          onClick={() => setActiveTab("freshness")}
        >
          🖼️ Freshness (Image)
        </button>
        <button
          className={`tab-button ${activeTab === "shelf" ? "active" : ""}`}
          onClick={() => setActiveTab("shelf")}
        >
          🧪 Shelf Life
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Dynamic Pricing Tab */}
      {activeTab === "dynamic" && (
        <div className="form-section">
          <h2>📊 Dynamic Pricing Calculator</h2>
          <p className="help-text">
            Calculates prices based on current market conditions
          </p>

          <div className="form-group">
            <label>Base Price ($):</label>
            <input
              type="number"
              value={formData.base_price}
              onChange={(e) =>
                setFormData({ ...formData, base_price: e.target.value })
              }
              placeholder="Enter base price"
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-row">
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

            <div className="form-group">
              <label>Demand Index (1-10):</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={formData.demand_index}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      demand_index: parseFloat(e.target.value),
                    })
                  }
                />
                <span>{formData.demand_index.toFixed(1)}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Seasonal Factor (0.7-1.3):</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.1"
                  value={formData.seasonal_factor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seasonal_factor: parseFloat(e.target.value),
                    })
                  }
                />
                <span>{formData.seasonal_factor.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <button
            className="primary-button"
            onClick={calculateDynamicPrice}
            disabled={loading || !formData.base_price}
          >
            {loading ? "Calculating..." : "Calculate Price"}
          </button>

          {result && (
            <div className="result-card success">
              <h3>✅ Calculated Price</h3>
              <div className="result-grid">
                <div className="result-item">
                  <span className="label">Recommended Price:</span>
                  <span className="value">${result.calculated_price?.toFixed(2)}</span>
                </div>
                <div className="result-item">
                  <span className="label">Base Price:</span>
                  <span className="value">${result.base_price?.toFixed(2)}</span>
                </div>
                <div className="result-item">
                  <span className="label">Freshness Impact:</span>
                  <span className="value">{result.freshness_impact?.toFixed(2)}%</span>
                </div>
                <div className="result-item">
                  <span className="label">Demand Impact:</span>
                  <span className="value">{result.demand_impact?.toFixed(2)}%</span>
                </div>
                <div className="result-item">
                  <span className="label">Seasonal Impact:</span>
                  <span className="value">{result.seasonal_impact?.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Pricing Tab */}
      {activeTab === "advanced" && (
        <div className="form-section">
          <h2>⚙️ Advanced Dynamic Pricing</h2>
          <p className="help-text">Include demand, season and range options</p>

          <div className="form-group">
            <label>Base Price ($):</label>
            <input
              type="number"
              value={formData.base_price}
              onChange={(e) =>
                setFormData({ ...formData, base_price: e.target.value })
              }
              placeholder="Enter base price"
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-row">
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

            <div className="form-group">
              <label>Demand Index (1-10):</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={formData.demand_index}
                  onChange={(e) =>
                    setFormData({ ...formData, demand_index: parseFloat(e.target.value) })
                  }
                />
                <span>{formData.demand_index.toFixed(1)}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Season:</label>
              <select
                value={formData.season || "normal"}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={!!formData.include_range}
                onChange={(e) => setFormData({ ...formData, include_range: e.target.checked })}
              />
              Include price range
            </label>
          </div>

          <div className="form-actions">
            <button
              className="primary-button"
              onClick={() => calculateAdvancedPrice(!!formData.include_range)}
              disabled={loading || !formData.base_price}
            >
              {loading ? "Calculating..." : "Calculate Advanced Price"}
            </button>
          </div>

          {result && (
            <div className="result-card success">
              <h3>✅ Advanced Price Result</h3>
              <div className="result-grid">
                <div className="result-item">
                  <span className="label">Suggested Price:</span>
                  <span className="value">${result.suggested_price?.toFixed(2) || result.suggested_price}</span>
                </div>
                <div className="result-item">
                  <span className="label">Price Change:</span>
                  <span className="value">{result.percentage_change?.toFixed(2)}%</span>
                </div>
                <div className="result-item">
                  <span className="label">Explanation:</span>
                  <span className="value">{result.explanation}</span>
                </div>
              </div>

              {result.price_range && (
                <div className="price-range">
                  <strong>Price Range:</strong>
                  <p>
                    Min: ${result.price_range.minimum_price?.toFixed(2)} — Suggested: ${result.price_range.suggested_price?.toFixed(2)} — Max: ${result.price_range.maximum_price?.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Freshness Image Tab */}
      {activeTab === "freshness" && (
        <div className="form-section">
          <h2>🖼️ Predict Freshness from Image</h2>
          <p className="help-text">Upload a product photo to estimate freshness and remaining days</p>

          <div className="form-group">
            <label>Upload Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFreshnessFile(e.target.files[0])}
            />
          </div>

          <button
            className="primary-button"
            onClick={uploadFreshnessImage}
            disabled={loading || !freshnessFile}
          >
            {loading ? "Analyzing..." : "Analyze Image"}
          </button>

          {freshnessResult && (
            <div className="result-card success">
              <h3>✅ Freshness Result</h3>
              <div className="result-grid">
                <div className="result-item">
                  <span className="label">Freshness Score:</span>
                  <span className="value">{freshnessResult.freshness_score}</span>
                </div>
                <div className="result-item">
                  <span className="label">Estimated Remaining Days:</span>
                  <span className="value">{freshnessResult.estimated_remaining_days || freshnessResult.estimated_days_remaining}</span>
                </div>
                <div className="result-item">
                  <span className="label">Category:</span>
                  <span className="value">{freshnessResult.freshness_category}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shelf Life Tab */}
      {activeTab === "shelf" && (
        <div className="form-section">
          <h2>🧪 Predict Shelf Life</h2>
          <p className="help-text">Quick legacy shelf-life estimate</p>

          <button
            className="primary-button"
            onClick={predictShelfLife}
            disabled={loading}
          >
            {loading ? "Predicting..." : "Predict Shelf Life"}
          </button>

          {result && result.shelf_life_days && (
            <div className="result-card success">
              <h3>✅ Shelf Life Estimate</h3>
              <p>Estimated days remaining: {result.shelf_life_days}</p>
              <p>Estimated freshness score: {result.freshness_score}</p>
            </div>
          )}
        </div>
      )}

      {/* ML Price Prediction Tab */}
      {activeTab === "ml" && (
        <div className="form-section">
          <h2>🤖 ML Price Prediction</h2>
          <p className="help-text">
            Uses machine learning to predict prices based on historical data
          </p>

          <div className="form-group">
            <label>Base Price ($):</label>
            <input
              type="number"
              value={mlFormData.base_price}
              onChange={(e) =>
                setMlFormData({ ...mlFormData, base_price: e.target.value })
              }
              placeholder="Enter base price"
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Freshness Score (0-1):</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={mlFormData.freshness_score}
                  onChange={(e) =>
                    setMlFormData({
                      ...mlFormData,
                      freshness_score: parseFloat(e.target.value),
                    })
                  }
                />
                <span>{mlFormData.freshness_score.toFixed(1)}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Demand Index (1-10):</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={mlFormData.demand_index}
                  onChange={(e) =>
                    setMlFormData({
                      ...mlFormData,
                      demand_index: parseFloat(e.target.value),
                    })
                  }
                />
                <span>{mlFormData.demand_index.toFixed(1)}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Seasonal Factor (0.7-1.3):</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.1"
                  value={mlFormData.seasonal_factor}
                  onChange={(e) =>
                    setMlFormData({
                      ...mlFormData,
                      seasonal_factor: parseFloat(e.target.value),
                    })
                  }
                />
                <span>{mlFormData.seasonal_factor.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <button
            className="primary-button"
            onClick={predictMLPrice}
            disabled={loading || !mlFormData.base_price}
          >
            {loading ? "Predicting..." : "Predict Price"}
          </button>

          {mlResult && (
            <div className="result-card success">
              <h3>✅ Price Prediction</h3>
              <div className="result-grid">
                <div className="result-item">
                  <span className="label">Predicted Price:</span>
                  <span className="value">${mlResult.predicted_price?.toFixed(2)}</span>
                </div>
                <div className="result-item">
                  <span className="label">Base Price:</span>
                  <span className="value">${mlResult.base_price?.toFixed(2)}</span>
                </div>
                <div className="result-item">
                  <span className="label">Price Change:</span>
                  <span className={mlResult.percentage_change > 0 ? "positive" : "negative"}>
                    {mlResult.percentage_change?.toFixed(2)}%
                  </span>
                </div>
                <div className="result-item">
                  <span className="label">Confidence:</span>
                  <span className="value">{mlResult.confidence}</span>
                </div>
              </div>
              {mlResult.recommendation && (
                <div className="recommendation">
                  <strong>💡 Recommendation:</strong> {mlResult.recommendation}
                </div>
              )}
              {mlResult.top_factors && mlResult.top_factors.length > 0 && (
                <div className="factors-list">
                  <strong>📊 Top Factors:</strong>
                  <ul>
                    {mlResult.top_factors.map((factor, idx) => (
                      <li key={idx}>
                        {factor.factor}: {factor.importance?.toFixed(1)}%
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Pricing;
