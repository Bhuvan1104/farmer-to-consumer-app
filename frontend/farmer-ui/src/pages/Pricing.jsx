import { useMemo, useState } from "react";
import API from "../services/api";
import "../styles/Pricing.css";

const STEPS = [
  "Freshness Analysis",
  "Base Price",
  "Dynamic Price",
  "Advanced Price",
  "ML Forecast",
];

const FACTOR_LABELS = {
  freshness: "Freshness",
  market_demand: "Market Demand",
  shelf_life: "Shelf Life",
  season: "Season",
};

function ImpactBoard({ title, data, basePrice, finalPrice }) {
  if (!data?.factor_stats?.length && !data?.top_factors?.length) return null;

  const factorStats = data.factor_stats || [];
  const topFactors = data.top_factors || [];
  const stats = data.statistics || {};
  const priceChange = Number(stats.price_change ?? (finalPrice - basePrice));
  const percentageChange = Number(stats.percentage_change ?? ((priceChange / basePrice) * 100 || 0));

  return (
    <div className="insight-panel">
      <div className="insight-header">
        <h4>{title}</h4>
        <span className={`insight-badge ${priceChange >= 0 ? "up" : "down"}`}>
          {priceChange >= 0 ? "+" : ""}{percentageChange.toFixed(2)}%
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-label">Base Price</span>
          <strong>{formatINR(basePrice)}</strong>
        </div>
        <div className="stat-box">
          <span className="stat-label">Final Price</span>
          <strong>{formatINR(finalPrice)}</strong>
        </div>
        <div className="stat-box">
          <span className="stat-label">Variation</span>
          <strong className={priceChange >= 0 ? "stat-up" : "stat-down"}>
            {priceChange >= 0 ? "+" : ""}{formatINR(priceChange)}
          </strong>
        </div>
      </div>

      {factorStats.length > 0 && (
        <div className="factor-list">
          {factorStats.map((factor) => {
            const impact = Number(factor.percentage_impact || 0);
            const width = Math.min(100, Math.max(8, Math.abs(impact) * 3));
            const tone = impact >= 0 ? "up" : "down";
            return (
              <div className="factor-row" key={`${title}-${factor.factor}`}>
                <div className="factor-copy">
                  <span className="factor-name">{factor.factor}</span>
                  <span className="factor-detail">{factor.detail}</span>
                </div>
                <div className="factor-bar-wrap">
                  <div className="factor-bar-track">
                    <div className={`factor-bar ${tone}`} style={{ width: `${width}%` }} />
                  </div>
                  <span className={`factor-impact ${tone}`}>
                    {impact >= 0 ? "+" : ""}{impact.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {topFactors.length > 0 && (
        <div className="signal-cloud">
          {topFactors.map((item, index) => (
            <span className="signal-pill" key={`${item.factor}-${index}`}>
              {FACTOR_LABELS[item.factor] || item.factor}: {(Number(item.importance) * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      )}

      {data.reasoning?.length > 0 && (
        <div className="reasoning-box">
          {data.reasoning.map((line, index) => (
            <p key={`${title}-reason-${index}`}>{line}</p>
          ))}
        </div>
      )}

      {data.recommendation && <p className="recommendation-line">{data.recommendation}</p>}
    </div>
  );
}

function formatINR(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "--";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function Pricing() {
  const [image, setImage] = useState(null);
  const [freshness, setFreshness] = useState(null);
  const [basePrice, setBasePrice] = useState("");
  const [demandIndex, setDemandIndex] = useState(5);
  const [season, setSeason] = useState("normal");
  const [seasonalFactor, setSeasonalFactor] = useState(1.0);

  const [dynamicPrice, setDynamicPrice] = useState(null);
  const [advancedPrice, setAdvancedPrice] = useState(null);
  const [mlPrice, setMlPrice] = useState(null);

  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [error, setError] = useState("");

  const hasFreshness = Boolean(freshness);
  const hasBasePrice = Number(basePrice) > 0;

  const completed = useMemo(
    () => [hasFreshness, hasBasePrice, Boolean(dynamicPrice), Boolean(advancedPrice), Boolean(mlPrice)],
    [hasFreshness, hasBasePrice, dynamicPrice, advancedPrice, mlPrice]
  );

  const currentStep = useMemo(() => {
    const idx = completed.findIndex((flag) => !flag);
    return idx === -1 ? STEPS.length - 1 : idx;
  }, [completed]);

  const freshnessTone = useMemo(() => {
    const score = Number(freshness?.freshness_score ?? 0);
    if (score >= 0.7) return "good";
    if (score >= 0.45) return "mid";
    return "low";
  }, [freshness]);

  const extractError = (err, fallback) => {
    const details = err?.response?.data;
    if (!details) return fallback;

    if (details.error) return details.error;
    if (details.message) return details.message;
    if (details.details && typeof details.details === "object") {
      const firstField = Object.keys(details.details)[0];
      const firstMessage = details.details[firstField]?.[0];
      if (firstMessage) return `${firstField}: ${firstMessage}`;
    }

    return fallback;
  };

  const getDelta = (target) => {
    const base = Number(basePrice);
    const next = Number(target);
    if (!base || Number.isNaN(next)) return null;

    const diff = next - base;
    const pct = (diff / base) * 100;
    return {
      diff,
      pct,
      tone: diff >= 0 ? "up" : "down",
    };
  };

  const analyzeImage = async () => {
    if (!image) {
      setError("Please upload a product image.");
      return;
    }

    setLoading(true);
    setActiveAction("freshness");
    setError("");

    try {
      const data = new FormData();
      data.append("image", image);

      const response = await API.post("pricing/predict-freshness/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFreshness(response.data);
      setDynamicPrice(null);
      setAdvancedPrice(null);
      setMlPrice(null);
    } catch (err) {
      setError(extractError(err, "Freshness prediction failed."));
    } finally {
      setLoading(false);
      setActiveAction("");
    }
  };

  const calculateDynamicPrice = async () => {
    if (!hasBasePrice || !hasFreshness) {
      setError("Analyze freshness and enter a valid base price first.");
      return;
    }

    setLoading(true);
    setActiveAction("dynamic");
    setError("");

    try {
      const response = await API.post("pricing/dynamic-price/", {
        base_price: Number(basePrice),
        freshness_score: freshness.freshness_score,
        estimated_remaining_days: freshness.estimated_remaining_days,
      });

      setDynamicPrice(response.data);
      setAdvancedPrice(null);
      setMlPrice(null);
    } catch (err) {
      setError(extractError(err, "Dynamic price calculation failed."));
    } finally {
      setLoading(false);
      setActiveAction("");
    }
  };

  const calculateAdvancedPrice = async () => {
    if (!dynamicPrice) {
      setError("Calculate dynamic price first.");
      return;
    }

    setLoading(true);
    setActiveAction("advanced");
    setError("");

    try {
      const response = await API.post("pricing/advanced-dynamic-price/", {
        base_price: Number(basePrice),
        freshness_score: freshness.freshness_score,
        estimated_remaining_days: freshness.estimated_remaining_days,
        demand_index: Number(demandIndex),
        season,
      });

      setAdvancedPrice(response.data);
      setMlPrice(null);
    } catch (err) {
      setError(extractError(err, "Advanced pricing failed."));
    } finally {
      setLoading(false);
      setActiveAction("");
    }
  };

  const predictMLPrice = async () => {
    if (!advancedPrice) {
      setError("Calculate advanced price first.");
      return;
    }

    setLoading(true);
    setActiveAction("ml");
    setError("");

    try {
      const response = await API.post("pricing/predict-price-ml/", {
        base_price: Number(basePrice),
        freshness_score: freshness.freshness_score,
        estimated_remaining_days: freshness.estimated_remaining_days,
        demand_index: Number(demandIndex),
        seasonal_factor: Number(seasonalFactor),
      });

      setMlPrice(response.data);
    } catch (err) {
      setError(extractError(err, "ML price prediction failed."));
    } finally {
      setLoading(false);
      setActiveAction("");
    }
  };

  const dynamicDelta = getDelta(dynamicPrice?.suggested_price);
  const advancedDelta = getDelta(advancedPrice?.suggested_price);
  const mlDelta = getDelta(mlPrice?.predicted_price);

  return (
    <div className="pricing-page">
      <div className="pricing-shell">
        <header className="pricing-hero">
          <div>
            <p className="hero-tag">Pricing Intelligence</p>
            <h1>AI Smart Pricing Workstation</h1>
            <p className="hero-subtitle">
              Build final market price in five guided stages using freshness, demand, seasonality, and forecasting.
            </p>
          </div>
          <div className="hero-state">
            <span className={`state-dot ${loading ? "busy" : "idle"}`} />
            {loading ? "Processing" : "System Ready"}
          </div>
        </header>

        <section className="workflow-strip">
          {STEPS.map((step, index) => {
            const isDone = completed[index];
            const isActive = currentStep === index;
            return (
              <div key={step} className={`step-chip ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}>
                <span className="step-index">{index + 1}</span>
                <span className="step-text">{step}</span>
              </div>
            );
          })}
        </section>

        {error && <div className="error-message">{error}</div>}

        <div className="workbench">
          <section className="main-panel">
            <article className="card card-main">
              <h2>1. Freshness Analysis</h2>
              <p className="section-note">Upload produce image for freshness and shelf-life analysis.</p>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setImage(e.target.files[0]);
                  setFreshness(null);
                  setDynamicPrice(null);
                  setAdvancedPrice(null);
                  setMlPrice(null);
                }}
              />
              {image && (
                <div className="image-preview">
                  <img src={URL.createObjectURL(image)} alt="uploaded" />
                </div>
              )}

              <button className="primary-button" onClick={analyzeImage} disabled={loading}>
                {activeAction === "freshness" ? (
                  <span className="btn-loading">
                    <span className="btn-spinner" />
                    Analyzing...
                  </span>
                ) : (
                  "Analyze Freshness"
                )}
              </button>

              {activeAction === "freshness" && (
                <div className="result-card skeleton-card">
                  <div className="skeleton-line wide" />
                  <div className="skeleton-grid">
                    <div className="skeleton-tile" />
                    <div className="skeleton-tile" />
                  </div>
                </div>
              )}

              {freshness && (
                <div className={`result-card tone-${freshnessTone}`}>
                  <div className="result-header">
                    <h3>Freshness Result</h3>
                    <span className={`badge badge-${freshnessTone}`}>{freshness.freshness_category}</span>
                  </div>

                  <div className="meter-wrap">
                    <div className="meter-track">
                      <div
                        className={`meter-fill meter-${freshnessTone}`}
                        style={{ width: `${Math.min(100, Math.max(0, Number(freshness.freshness_score) * 100))}%` }}
                      />
                    </div>
                    <span className="meter-value">{(Number(freshness.freshness_score) * 100).toFixed(1)}%</span>
                  </div>

                  <div className="metric-grid">
                    <div className="metric">
                      <span className="metric-label">Detected Crop</span>
                      <span className="metric-value">{freshness.detected_crop || "Unknown"}</span>
                    </div>

                    <div className="metric">
                      <span className="metric-label">Freshness Score</span>
                      <span className="metric-value">{Number(freshness.freshness_score).toFixed(3)}</span>
                    </div>

                    <div className="metric">
                      <span className="metric-label">Shelf Life</span>
                      <span className="metric-value">{freshness.estimated_remaining_days} days</span>
                    </div>
                  </div>
                  {freshness.crop_detection_error && (
                    <p className="delta-line down">Crop detection error: {freshness.crop_detection_error}</p>
                  )}
                </div>
              )}
            </article>

            <article className="card">
              <h2>2. Base Price</h2>
              <p className="section-note">Set the baseline price before AI adjustments.</p>

              <label className="field-label">Base Price (INR)</label>
              <input
                type="number"
                placeholder="e.g. 120"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
              />
            </article>

            <article className="card">
              <h2>3. Dynamic Price</h2>
              <p className="section-note">Freshness-adjusted recommendation.</p>

              <button className="primary-button" onClick={calculateDynamicPrice} disabled={loading}>
                {activeAction === "dynamic" ? (
                  <span className="btn-loading">
                    <span className="btn-spinner" />
                    Calculating...
                  </span>
                ) : (
                  "Calculate Dynamic Price"
                )}
              </button>

              {activeAction === "dynamic" && (
                <div className="result-card skeleton-card">
                  <div className="skeleton-grid">
                    <div className="skeleton-tile" />
                    <div className="skeleton-tile" />
                  </div>
                </div>
              )}

              {dynamicPrice && (
                <div className="result-card">
                  <div className="metric-grid two-col">
                    <div className="metric">
                      <span className="metric-label">Suggested Price</span>
                      <span className="metric-value">{formatINR(dynamicPrice.suggested_price)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Discount</span>
                      <span className="metric-value">{Number(dynamicPrice.discount_percentage).toFixed(2)}%</span>
                    </div>
                  </div>

                  {dynamicDelta && (
                    <p className={`delta-line ${dynamicDelta.tone}`}>
                      {dynamicDelta.tone === "up" ? "Up" : "Down"} by {formatINR(Math.abs(dynamicDelta.diff))} (
                      {Math.abs(dynamicDelta.pct).toFixed(2)}%) from base price
                    </p>
                  )}

                  <ImpactBoard
                    title="Why Dynamic Price Changed"
                    data={dynamicPrice}
                    basePrice={Number(basePrice)}
                    finalPrice={Number(dynamicPrice.suggested_price)}
                  />
                </div>
              )}
            </article>

            <article className="card">
              <h2>4. Advanced Pricing</h2>
              <p className="section-note">Refine with demand and seasonal effects.</p>

              <label className="field-label">Demand Index: {demandIndex}</label>
              <input
                type="range"
                min="1"
                max="10"
                value={demandIndex}
                onChange={(e) => setDemandIndex(Number(e.target.value))}
              />

              <label className="field-label">Season</label>
              <select value={season} onChange={(e) => setSeason(e.target.value)}>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>

              <button className="primary-button" onClick={calculateAdvancedPrice} disabled={loading}>
                {activeAction === "advanced" ? (
                  <span className="btn-loading">
                    <span className="btn-spinner" />
                    Calculating...
                  </span>
                ) : (
                  "Calculate Advanced Price"
                )}
              </button>

              {activeAction === "advanced" && (
                <div className="result-card skeleton-card">
                  <div className="skeleton-grid">
                    <div className="skeleton-tile" />
                    <div className="skeleton-tile" />
                  </div>
                </div>
              )}

              {advancedPrice && (
                <div className="result-card">
                  <div className="metric-grid two-col">
                    <div className="metric">
                      <span className="metric-label">Advanced Price</span>
                      <span className="metric-value">{formatINR(advancedPrice.suggested_price)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Change</span>
                      <span className="metric-value">{Number(advancedPrice.percentage_change).toFixed(2)}%</span>
                    </div>
                  </div>

                  {advancedDelta && (
                    <p className={`delta-line ${advancedDelta.tone}`}>
                      {advancedDelta.tone === "up" ? "Up" : "Down"} by {formatINR(Math.abs(advancedDelta.diff))} (
                      {Math.abs(advancedDelta.pct).toFixed(2)}%) from base price
                    </p>
                  )}

                  <ImpactBoard
                    title="Advanced Price Drivers"
                    data={advancedPrice}
                    basePrice={Number(basePrice)}
                    finalPrice={Number(advancedPrice.suggested_price)}
                  />
                </div>
              )}
            </article>

            <article className="card card-main">
              <h2>5. ML Price Forecast</h2>
              <p className="section-note">Forecast future movement using ML signals.</p>

              <label className="field-label">Seasonal Factor: {Number(seasonalFactor).toFixed(1)}</label>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.1"
                value={seasonalFactor}
                onChange={(e) => setSeasonalFactor(Number(e.target.value))}
              />

              <button className="primary-button" onClick={predictMLPrice} disabled={loading}>
                {activeAction === "ml" ? (
                  <span className="btn-loading">
                    <span className="btn-spinner" />
                    Forecasting...
                  </span>
                ) : (
                  "Predict Future Price"
                )}
              </button>

              {activeAction === "ml" && (
                <div className="result-card skeleton-card">
                  <div className="skeleton-grid three">
                    <div className="skeleton-tile" />
                    <div className="skeleton-tile" />
                    <div className="skeleton-tile" />
                  </div>
                </div>
              )}

              {mlPrice && (
                <div className="result-card">
                  <div className="metric-grid three-col">
                    <div className="metric">
                      <span className="metric-label">Predicted</span>
                      <span className="metric-value">{formatINR(mlPrice.predicted_price)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Price Change</span>
                      <span className="metric-value">{Number(mlPrice.percentage_change).toFixed(2)}%</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Confidence</span>
                      <span className="metric-value">{mlPrice.confidence}</span>
                    </div>
                  </div>

                  {mlDelta && (
                    <p className={`delta-line ${mlDelta.tone}`}>
                      {mlDelta.tone === "up" ? "Up" : "Down"} by {formatINR(Math.abs(mlDelta.diff))} (
                      {Math.abs(mlDelta.pct).toFixed(2)}%) from base price
                    </p>
                  )}

                  <ImpactBoard
                    title="Forecast Reasoning"
                    data={mlPrice}
                    basePrice={Number(basePrice)}
                    finalPrice={Number(mlPrice.predicted_price)}
                  />
                </div>
              )}
            </article>
          </section>

          <aside className="side-panel card">
            <h2>Live Summary</h2>
            <p className="section-note">Current pricing workflow status.</p>

            <div className="summary-list">
              <div className="summary-item">
                <span>Base Price</span>
                <strong>{hasBasePrice ? formatINR(basePrice) : "--"}</strong>
              </div>
              <div className="summary-item">
                <span>Freshness</span>
                <strong>{hasFreshness ? Number(freshness.freshness_score).toFixed(3) : "--"}</strong>
              </div>
              <div className="summary-item">
                <span>Shelf Life</span>
                <strong>{hasFreshness ? `${freshness.estimated_remaining_days} days` : "--"}</strong>
              </div>
              <div className="summary-item">
                <span>Demand</span>
                <strong>{demandIndex}/10</strong>
              </div>
              <div className="summary-item">
                <span>Dynamic</span>
                <strong>{dynamicPrice ? formatINR(dynamicPrice.suggested_price) : "--"}</strong>
              </div>
              <div className="summary-item">
                <span>Advanced</span>
                <strong>{advancedPrice ? formatINR(advancedPrice.suggested_price) : "--"}</strong>
              </div>
              <div className="summary-item">
                <span>ML Forecast</span>
                <strong>{mlPrice ? formatINR(mlPrice.predicted_price) : "--"}</strong>
              </div>
            </div>

            <div className="completion-card">
              <p>Workflow Completion</p>
              <h3>{Math.round((completed.filter(Boolean).length / STEPS.length) * 100)}%</h3>
              <div className="meter-track compact">
                <div
                  className="meter-fill meter-good"
                  style={{ width: `${(completed.filter(Boolean).length / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Pricing;
