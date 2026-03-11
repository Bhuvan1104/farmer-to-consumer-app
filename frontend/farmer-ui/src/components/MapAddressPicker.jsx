import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import API from "../services/api";
import "./MapAddressPicker.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const DEFAULT_CENTER = [17.385, 78.4867];

function MapViewport({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center?.length === 2) map.setView(center, 14);
  }, [center, map]);
  return null;
}

function ClickToSelect({ onPick }) {
  useMapEvents({ click(event) { onPick(event.latlng); } });
  return null;
}

function buildFallbackResult(latlng) {
  return {
    display_name: `Pinned location (${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)})`,
    latitude: latlng.lat,
    longitude: latlng.lng,
    components: { house_number: "", road: "", suburb: "", city: "", state: "", postcode: "", country: "India" },
    fallback: true,
  };
}

function MapAddressPicker({ open, title, initialQuery = "", onClose, onSelect }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [reverseResult, setReverseResult] = useState(null);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery || "");
    setResults([]);
    setSelectedPoint(null);
    setReverseResult(null);
    setError("");
  }, [open, initialQuery]);

  const canSearch = useMemo(() => query.trim().length >= 3, [query]);
  const mapCenter = useMemo(() => {
    if (selectedPoint) return [selectedPoint.lat, selectedPoint.lng];
    if (results[0]) return [results[0].latitude, results[0].longitude];
    return DEFAULT_CENTER;
  }, [results, selectedPoint]);

  const handleSearch = async () => {
    if (!canSearch) {
      setError("Enter at least 3 characters to search the map.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await API.get("users/map-search/", { params: { q: query } });
      const matches = response.data?.results || [];
      setResults(matches);
      if (matches[0]) {
        setSelectedPoint({ lat: matches[0].latitude, lng: matches[0].longitude });
        setReverseResult(matches[0]);
      }
      if (!matches.length) setError("No map results found. Try adding area, city, or pincode.");
    } catch (err) {
      setError(err.response?.data?.detail || "Map search failed.");
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocodePoint = async (latlng) => {
    setSelectedPoint(latlng);
    setReverseResult(buildFallbackResult(latlng));
    try {
      setReverseLoading(true);
      setError("");
      const response = await API.get("users/map-reverse/", { params: { lat: latlng.lat, lon: latlng.lng } });
      setReverseResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Reverse geocoding failed. You can still use the pinned coordinates.");
    } finally {
      setReverseLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Current location is not supported on this device/browser.");
      return;
    }
    setLocationLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        reverseGeocodePoint({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        setError("Unable to access current location. Please allow location access and try again.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  if (!open) return null;

  return (
    <div className="map-picker-overlay">
      <div className="map-picker-modal interactive">
        <div className="map-picker-header">
          <div>
            <h3>{title}</h3>
            <p>Search a place, use your current location, or click directly on the map to drop a pin.</p>
          </div>
          <button type="button" className="map-picker-close" onClick={onClose}>Close</button>
        </div>

        <div className="map-picker-search">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search area, city, landmark, or pincode" />
          <button type="button" onClick={handleSearch} disabled={loading}>{loading ? "Searching..." : "Search Map"}</button>
          <button type="button" className="secondary" onClick={useCurrentLocation} disabled={locationLoading}>{locationLoading ? "Locating..." : "Use Current Location"}</button>
        </div>

        {error ? <div className="map-picker-error">{error}</div> : null}

        <div className="map-picker-layout">
          <div className="map-canvas-card">
            <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="map-canvas">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapViewport center={mapCenter} />
              <ClickToSelect onPick={reverseGeocodePoint} />
              {selectedPoint ? <Marker position={[selectedPoint.lat, selectedPoint.lng]} /> : null}
            </MapContainer>
            <div className="map-help-text">Tap or click anywhere on the map to drop a pin and fetch the nearest address. If lookup fails, coordinates can still be used.</div>
          </div>

          <div className="map-side-panel">
            <div className="map-results-panel">
              <h4>Search Results</h4>
              <div className="map-picker-results compact">
                {results.map((item, index) => (
                  <div className="map-result-card compact" key={`${item.display_name}-${index}`}>
                    <div className="map-result-copy">
                      <strong>{item.display_name}</strong>
                      <div className="map-result-meta">
                        <span>{item.components?.city || item.components?.suburb || "Area not specified"}</span>
                        <span>{item.components?.postcode || "No pincode"}</span>
                      </div>
                      <div className="map-result-actions">
                        <button type="button" onClick={() => { setSelectedPoint({ lat: item.latitude, lng: item.longitude }); setReverseResult(item); }}>Preview</button>
                        <button type="button" className="solid" onClick={() => onSelect(item)}>Select</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="map-results-panel selected">
              <h4>Selected Pin</h4>
              {selectedPoint ? (
                <>
                  <div className="selected-coords">Lat {selectedPoint.lat.toFixed(5)} | Lon {selectedPoint.lng.toFixed(5)}</div>
                  {reverseLoading ? <p className="map-help-text">Fetching nearest address...</p> : null}
                  {reverseResult ? (
                    <div className="map-result-card compact selected-card">
                      <div className="map-result-copy">
                        <strong>{reverseResult.display_name}</strong>
                        <div className="map-result-meta">
                          <span>{reverseResult.components?.city || reverseResult.components?.suburb || "Area not specified"}</span>
                          <span>{reverseResult.components?.postcode || "No pincode"}</span>
                          {reverseResult.fallback ? <span>Using coordinate fallback</span> : null}
                        </div>
                        <button type="button" className="solid" onClick={() => onSelect(reverseResult)}>Use Selected Location</button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : <p className="map-help-text">Search, use current location, or drop a pin to populate a selectable address here.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapAddressPicker;
