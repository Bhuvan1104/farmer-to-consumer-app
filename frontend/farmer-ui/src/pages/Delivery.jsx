import { useEffect, useMemo, useState } from "react";

import MapAddressPicker from "../components/MapAddressPicker";
import { useLanguage } from "../context/LanguageContext";
import API from "../services/api";
import "../styles/Delivery.css";
import { getUserRole } from "../utils/auth";

const ACTIVE_STATUSES = ["confirmed", "packed", "shipped", "out_for_delivery"];

const categoryToProductType = (category = "") => {
  const normalized = String(category).toLowerCase();
  if (normalized.includes("fruit") || normalized.includes("mango") || normalized.includes("banana")) return "fruits";
  if (normalized.includes("milk") || normalized.includes("cheese") || normalized.includes("dairy")) return "dairy";
  if (normalized.includes("meat") || normalized.includes("chicken") || normalized.includes("fish")) return "meats";
  if (normalized.includes("herb") || normalized.includes("leaf")) return "herbs";
  if (normalized.includes("berry")) return "berries";
  return "vegetables";
};

const getRiskColor = (risk = 0) => (risk < 20 ? "#1d9b5f" : risk < 40 ? "#d5921a" : "#d64545");
const buildMapEmbedUrl = (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const delta = 0.03;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${[lon - delta, lat - delta, lon + delta, lat + delta].join(",")}&layer=mapnik&marker=${lat}%2C${lon}`;
};
const buildMapSearchUrl = (query) => `https://www.openstreetmap.org/search?query=${encodeURIComponent(query || "")}`;

const buildSingleSuggestions = (metrics, order) => {
  if (!metrics || !order) return [];
  const suggestions = [];
  if (metrics.spoilage_risk_percentage >= 35) suggestions.push("Dispatch this order in the next available slot to reduce spoilage exposure.");
  if (metrics.distance_km > 40) suggestions.push("Keep the rider route tight and confirm the customer is available before pickup.");
  if (!metrics.temperature_controlled && ["dairy", "meats", "berries"].includes(metrics.product_type)) suggestions.push("Temperature control is strongly recommended for this product type.");
  if ((order.product_freshness_score || 0) < 0.5) suggestions.push("Use extra packaging protection and prioritize proof of delivery because freshness is already low.");
  if (!suggestions.length) suggestions.push("This order looks healthy for standard dispatch from the planned warehouse location.");
  return suggestions;
};

const buildBatchSuggestions = (batchResult) => {
  if (!batchResult) return [];
  const suggestions = [];
  if (batchResult.route_efficiency_score < 70) suggestions.push("This batch is geographically spread out. Splitting into two clusters could reduce rider time.");
  if (batchResult.average_spoilage_risk_percentage > 30) suggestions.push("Average spoilage exposure is elevated. Dispatch the most sensitive produce on the first stops.");
  if (!batchResult.temperature_controlled) suggestions.push("A temperature-controlled vehicle would improve safety for later stops in this batch.");
  if (batchResult.total_orders >= 4) suggestions.push("Confirm rider capacity and crate layout before dispatch so heavier orders do not delay unloading.");
  if (!suggestions.length) suggestions.push("The selected orders form a compact route. This is a good candidate for one combined trip.");
  return suggestions;
};

function Delivery() {
  const { language } = useLanguage();
  const te = language === "te";
  const role = getUserRole();
  const [orders, setOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [farmerLocation, setFarmerLocation] = useState("");
  const [farmerCoords, setFarmerCoords] = useState({ latitude: null, longitude: null });
  const [warehouseName, setWarehouseName] = useState("");
  const [temperatureControlled, setTemperatureControlled] = useState(false);
  const [singleResult, setSingleResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);

  const farmerOrders = useMemo(() => orders.filter((order) => ACTIVE_STATUSES.includes(order.status)), [orders]);
  const selectedOrders = useMemo(() => farmerOrders.filter((order) => selectedOrderIds.includes(order.id)), [farmerOrders, selectedOrderIds]);
  const primaryOrder = selectedOrders[0] || null;
  const singleSuggestions = useMemo(() => buildSingleSuggestions(singleResult, primaryOrder), [singleResult, primaryOrder]);
  const batchSuggestions = useMemo(() => buildBatchSuggestions(batchResult), [batchResult]);

  useEffect(() => {
    if (role !== "farmer") {
      setError(te ? "ఈ పేజీ రైతుల డెలివరీ ప్లానింగ్ కోసం మాత్రమే." : "This page is designed for farmers to plan delivery from confirmed orders.");
      setOrdersLoading(false);
      return;
    }
    loadDeliveryData();
  }, [role]);

  const loadDeliveryData = async () => {
    try {
      setOrdersLoading(true);
      const [ordersResponse, profileResponse] = await Promise.all([API.get("orders/"), API.get("users/profile/")]);
      const orderList = Array.isArray(ordersResponse.data) ? ordersResponse.data : [];
      const nextSelection = orderList.filter((order) => ACTIVE_STATUSES.includes(order.status)).slice(0, 2).map((order) => order.id);
      setOrders(orderList);
      setSelectedOrderIds(nextSelection);
      setWarehouseName(profileResponse.data?.warehouse_name || "");
      setFarmerLocation(profileResponse.data?.dispatch_location || localStorage.getItem("delivery_farmer_location") || "");
      setFarmerCoords({ latitude: profileResponse.data?.dispatch_latitude ?? null, longitude: profileResponse.data?.dispatch_longitude ?? null });
    } catch {
      setError(te ? "డెలివరీ ప్లానింగ్ డేటా లోడ్ కాలేదు." : "Failed to load delivery planning data.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds((current) => current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]);
    setSingleResult(null);
    setBatchResult(null);
    setError("");
  };

  const saveWarehouseProfile = async () => {
    if (!farmerLocation.trim()) {
      setError("Enter the farmer pickup point or warehouse address before saving.");
      return;
    }
    try {
      setSavingProfile(true);
      setProfileMessage("");
      const response = await API.put("users/profile/", { warehouse_name: warehouseName, dispatch_location: farmerLocation, dispatch_latitude: farmerCoords.latitude, dispatch_longitude: farmerCoords.longitude });
      setWarehouseName(response.data?.warehouse_name || "");
      setFarmerLocation(response.data?.dispatch_location || farmerLocation);
      setFarmerCoords({ latitude: response.data?.dispatch_latitude ?? farmerCoords.latitude, longitude: response.data?.dispatch_longitude ?? farmerCoords.longitude });
      localStorage.setItem("delivery_farmer_location", response.data?.dispatch_location || farmerLocation);
      setProfileMessage("Warehouse base saved. Delivery planning will now reuse the stored coordinates when available.");
    } catch {
      setError(te ? "గిడ్డంగి స్థానం సేవ్ కాలేదు." : "Failed to save warehouse location.");
    } finally {
      setSavingProfile(false);
    }
  };

  const calculateSingleDelivery = async () => {
    if (!primaryOrder || !farmerLocation.trim()) {
      setError("Select an order and add the dispatch location first.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setBatchResult(null);
      localStorage.setItem("delivery_farmer_location", farmerLocation);
      const response = await API.post("orders/delivery/calculate/", {
        farmer_location: farmerLocation,
        farmer_latitude: farmerCoords.latitude,
        farmer_longitude: farmerCoords.longitude,
        customer_location: primaryOrder.delivery_address,
        customer_latitude: primaryOrder.delivery_latitude,
        customer_longitude: primaryOrder.delivery_longitude,
        freshness_score: Number(primaryOrder.product_freshness_score ?? 0.8),
        temperature_controlled: temperatureControlled,
        product_type: categoryToProductType(primaryOrder.product_category),
      });
      setSingleResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to calculate single-order delivery metrics.");
    } finally {
      setLoading(false);
    }
  };

  const calculateBatchDelivery = async () => {
    if (selectedOrders.length < 2 || !farmerLocation.trim()) {
      setError("Select at least two orders and set the dispatch location first.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setSingleResult(null);
      localStorage.setItem("delivery_farmer_location", farmerLocation);
      const response = await API.post("orders/delivery/batch-calculate/", {
        farmer_location: farmerLocation,
        farmer_latitude: farmerCoords.latitude,
        farmer_longitude: farmerCoords.longitude,
        temperature_controlled: temperatureControlled,
        deliveries: selectedOrders.map((order) => ({
          order_id: order.id,
          customer_name: order.consumer_username,
          customer_location: order.delivery_address,
          customer_latitude: order.delivery_latitude,
          customer_longitude: order.delivery_longitude,
          product_name: order.product_name,
          freshness_score: Number(order.product_freshness_score ?? 0.8),
          quantity: Number(order.quantity || 1),
          product_type: categoryToProductType(order.product_category),
        })),
      });
      setBatchResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to calculate batch delivery metrics.");
    } finally {
      setLoading(false);
    }
  };

  const readinessScore = useMemo(() => {
    const risk = singleResult?.spoilage_risk_percentage;
    if (risk == null) return 0;
    let score = 100 - risk * 0.7;
    if (singleResult?.temperature_controlled) score += 8;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [singleResult]);

  const farmerMapUrl = useMemo(() => buildMapSearchUrl(singleResult?.addresses?.farmer_normalized || farmerLocation), [singleResult, farmerLocation]);
  const customerMapUrl = useMemo(() => buildMapSearchUrl(singleResult?.addresses?.customer_normalized || primaryOrder?.delivery_address), [singleResult, primaryOrder]);

  return (
    <div className="delivery-page">
      <div className="delivery-container">
        <div className="delivery-header">
          <h1>{te ? "డిస్పాచ్ ప్లానింగ్ కన్సోల్" : "Dispatch Planning Console"}</h1>
          <p>{te ? "లైవ్ ఆర్డర్లు ఎంచుకుని, సేవ్ చేసిన కోఆర్డినేట్లతో సింగిల్ లేదా మల్టీ-స్టాప్ డెలివరీ ప్లాన్ చేయండి." : "Choose live orders, auto-use saved customer coordinates when available, and plan single or multi-stop delivery from your warehouse."}</p>
        </div>

        {error && <div className="alert error">{error}</div>}
        {profileMessage && <div className="alert success">{profileMessage}</div>}

        <div className="delivery-grid">
          <div className="delivery-card dispatch-card">
            <div className="section-head-row">
              <h2>{te ? "డిస్పాచ్ బేస్" : "Dispatch Base"}</h2>
              <button type="button" className="map-pick-btn" onClick={() => setShowMapPicker(true)}>{te ? "మ్యాప్ నుంచి ఎంచుకోండి" : "Pick From Map"}</button>
            </div>
            <div className="form-group">
              <label>Warehouse Name</label>
              <input type="text" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} placeholder="Example: Vanasthalipuram Collection Hub" />
            </div>
            <div className="form-group">
              <label>Dispatch Location</label>
              <textarea value={farmerLocation} onChange={(e) => setFarmerLocation(e.target.value)} placeholder="Enter the farmer pickup point or warehouse address once and reuse it for all trips" rows={3} />
            </div>
            <div className="coord-chip-row">
              {farmerCoords.latitude && farmerCoords.longitude ? <span className="coord-chip">Lat {Number(farmerCoords.latitude).toFixed(5)} | Lon {Number(farmerCoords.longitude).toFixed(5)}</span> : <span className="coord-chip muted">No saved coordinates yet</span>}
            </div>
            <button className="btn-secondary full-width" onClick={saveWarehouseProfile} disabled={savingProfile}>{savingProfile ? "Saving..." : "Save Dispatch Base"}</button>
            <div className="map-link-row"><a href={buildMapSearchUrl(farmerLocation)} target="_blank" rel="noreferrer">Open dispatch base in map search</a></div>

            <div className="control-row">
              <div className="checkbox-group compact">
                <input type="checkbox" checked={temperatureControlled} onChange={(e) => setTemperatureControlled(e.target.checked)} />
                <label>Temperature-controlled vehicle</label>
              </div>
            </div>

            <h2 className="section-title">{te ? "ఆర్డర్ ఎంపిక" : "Order Selection"}</h2>
            {ordersLoading ? <p className="helper-text">{te ? "యాక్టివ్ రైతు ఆర్డర్లు లోడ్ అవుతున్నాయి..." : "Loading active farmer orders..."}</p> : farmerOrders.length === 0 ? <p className="helper-text">{te ? "డిస్పాచ్‌కు సిద్ధంగా ఉన్న ఆర్డర్లు లేవు." : "No confirmed or in-progress orders are ready for dispatch yet."}</p> : (
              <div className="order-selector-list multi">
                {farmerOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  return (
                    <button key={order.id} type="button" className={`order-choice ${isSelected ? "active" : ""}`} onClick={() => toggleOrderSelection(order.id)}>
                      <div className="order-choice-main">
                        <div className="selection-dot">{isSelected ? "Selected" : "Add"}</div>
                        <div>
                          <strong>Order #{order.id}</strong>
                          <span>{order.product_name} x {order.quantity}</span>
                          <p>{order.delivery_address || "No customer address saved"}</p>
                          <div className="order-meta-line">{order.delivery_latitude && order.delivery_longitude ? "Saved pin available" : "Address geocoding may be needed"}</div>
                        </div>
                      </div>
                      <span className={`status-chip status-${order.status}`}>{order.status.replaceAll("_", " ")}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="selection-summary">
              <div><span>Selected Orders</span><strong>{selectedOrders.length}</strong></div>
              <div><span>Primary Order</span><strong>{primaryOrder ? `#${primaryOrder.id}` : "--"}</strong></div>
            </div>

            {primaryOrder ? (
              <div className="pin-fallback-card">
                <span>Customer Delivery Signal</span>
                <strong>{primaryOrder.consumer_username}</strong>
                <p>{primaryOrder.delivery_address}</p>
                <div className="address-meta-row">
                  {primaryOrder.delivery_latitude && primaryOrder.delivery_longitude ? <span>Saved delivery coordinates available</span> : <span>Text address only</span>}
                </div>
                <a href={buildMapSearchUrl(primaryOrder.delivery_address)} target="_blank" rel="noreferrer">Open customer address in map search</a>
              </div>
            ) : null}

            <div className="action-stack">
              <button className="btn-primary full-width" onClick={calculateSingleDelivery} disabled={loading || !primaryOrder || !farmerLocation.trim()}>{loading ? (te ? "లెక్కిస్తోంది..." : "Calculating...") : (te ? "సింగిల్ డెలివరీ లెక్కించు" : "Calculate Single Delivery")}</button>
              <button className="btn-outline full-width" onClick={calculateBatchDelivery} disabled={loading || selectedOrders.length < 2 || !farmerLocation.trim()}>{loading ? (te ? "లెక్కిస్తోంది..." : "Calculating...") : (te ? "బ్యాచ్ రూట్ ప్లాన్ చేయండి" : "Plan Batch Route")}</button>
            </div>
          </div>

          <div className="delivery-card analytics-card">
            <h2>{te ? "డెలివరీ ఇంటెలిజెన్స్" : "Delivery Intelligence"}</h2>
            {!singleResult && !batchResult ? <p className="helper-text">Run a single-order metric for dispatch readiness or select multiple orders to generate a combined route with efficiency and spoilage exposure.</p> : null}

            {singleResult && primaryOrder && (
              <div className="analysis-block">
                <div className="metrics-topline">
                  <div className="highlight-card"><span>Dispatch Priority</span><strong>{singleResult.spoilage_risk_percentage >= 40 ? "Urgent Dispatch" : singleResult.spoilage_risk_percentage >= 20 ? "Priority Queue" : "Standard Dispatch"}</strong></div>
                  <div className="highlight-card"><span>Readiness Score</span><strong>{readinessScore}%</strong></div>
                </div>
                <div className="metric"><span>Customer</span><strong>{primaryOrder.consumer_username}</strong></div>
                <div className="metric"><span>Distance</span><strong>{singleResult.distance_km?.toFixed(2)} km</strong></div>
                <div className="metric"><span>Estimated Time</span><strong>{singleResult.estimated_delivery_hours?.toFixed(1)} hrs</strong></div>
                <div className="metric"><span>Spoilage Risk</span><strong style={{ color: getRiskColor(singleResult.spoilage_risk_percentage) }}>{singleResult.spoilage_risk_percentage?.toFixed(1)}%</strong></div>
                <div className="risk-bar"><div className="risk-fill" style={{ width: `${singleResult.spoilage_risk_percentage}%`, background: getRiskColor(singleResult.spoilage_risk_percentage) }} /></div>

                <div className="address-trace">
                  <div><span>Dispatch Base Used</span><strong>{singleResult.addresses?.farmer_normalized || farmerLocation}</strong></div>
                  <div><span>Customer Address Used</span><strong>{singleResult.addresses?.customer_normalized || primaryOrder.delivery_address}</strong></div>
                </div>

                <div className="map-preview-grid">
                  {singleResult.coordinates?.farmer ? <div className="map-preview-card"><span>Dispatch Base Map Preview</span><iframe title="Dispatch base map" src={buildMapEmbedUrl(singleResult.coordinates.farmer.latitude, singleResult.coordinates.farmer.longitude)} loading="lazy" /><a href={farmerMapUrl} target="_blank" rel="noreferrer">Open full map search</a></div> : null}
                  {singleResult.coordinates?.customer ? <div className="map-preview-card"><span>Customer Map Preview</span><iframe title="Customer map" src={buildMapEmbedUrl(singleResult.coordinates.customer.latitude, singleResult.coordinates.customer.longitude)} loading="lazy" /><a href={customerMapUrl} target="_blank" rel="noreferrer">Open full map search</a></div> : null}
                </div>

                <div className="metric-grid">
                  <div className="mini-metric"><span>Risk Category</span><strong>{singleResult.spoilage_category}</strong></div>
                  <div className="mini-metric"><span>Delivery Viable</span><strong>{singleResult.is_viable ? "Yes" : "No"}</strong></div>
                  <div className="mini-metric"><span>Product Type</span><strong>{singleResult.product_type}</strong></div>
                </div>
                <div className="recommendation">{singleResult.recommendation}</div>
                <div className="suggestions-box"><h3>Suggested Actions</h3>{singleSuggestions.map((item) => <p key={item}>{item}</p>)}</div>
              </div>
            )}

            {batchResult && (
              <div className="analysis-block">
                <div className="metrics-topline batch-topline">
                  <div className="highlight-card"><span>Orders In Trip</span><strong>{batchResult.total_orders}</strong></div>
                  <div className="highlight-card"><span>Route Efficiency</span><strong>{batchResult.route_efficiency_score?.toFixed(0)}%</strong></div>
                </div>
                <div className="metric"><span>Total Route Distance</span><strong>{batchResult.total_distance_km?.toFixed(2)} km</strong></div>
                <div className="metric"><span>Total Estimated Time</span><strong>{batchResult.estimated_total_hours?.toFixed(1)} hrs</strong></div>
                <div className="metric"><span>Average Spoilage Risk</span><strong style={{ color: getRiskColor(batchResult.average_spoilage_risk_percentage) }}>{batchResult.average_spoilage_risk_percentage?.toFixed(1)}%</strong></div>
                <div className="risk-bar"><div className="risk-fill" style={{ width: `${batchResult.average_spoilage_risk_percentage}%`, background: getRiskColor(batchResult.average_spoilage_risk_percentage) }} /></div>
                <div className="route-origin"><span>Dispatching From</span><strong>{batchResult.origin?.normalized || farmerLocation}</strong></div>
                <div className="map-link-row compact"><a href={buildMapSearchUrl(batchResult.origin?.normalized || farmerLocation)} target="_blank" rel="noreferrer">Open route origin in map search</a></div>
                <div className="recommendation">{batchResult.recommendation}</div>
                <div className="stops-panel">
                  <h3>Suggested Stop Order</h3>
                  {batchResult.stops?.map((stop) => (
                    <div className="stop-card" key={`${stop.order_id}-${stop.sequence}`}>
                      <div className="stop-sequence">{stop.sequence}</div>
                      <div className="stop-body">
                        <strong>Order #{stop.order_id} · {stop.product_name}</strong>
                        <p>{stop.customer_name}</p>
                        <p>{stop.address}</p>
                        <div className="stop-meta">
                          <span>{stop.distance_from_previous_km?.toFixed(2)} km from previous</span>
                          <span>{stop.estimated_arrival_hours?.toFixed(1)} hrs ETA</span>
                          <span style={{ color: getRiskColor(stop.spoilage_risk_percentage) }}>{stop.spoilage_risk_percentage?.toFixed(1)}% risk</span>
                        </div>
                        <a href={buildMapSearchUrl(stop.address)} target="_blank" rel="noreferrer">Open stop in map search</a>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="suggestions-box"><h3>Suggested Actions</h3>{batchSuggestions.map((item) => <p key={item}>{item}</p>)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <MapAddressPicker
        open={showMapPicker}
        title="Pick Dispatch Base From Map"
        initialQuery={farmerLocation}
        onClose={() => setShowMapPicker(false)}
        onSelect={(result) => {
          setFarmerLocation(result.display_name);
          setFarmerCoords({ latitude: result.latitude ?? null, longitude: result.longitude ?? null });
          setShowMapPicker(false);
        }}
      />
    </div>
  );
}

export default Delivery;

